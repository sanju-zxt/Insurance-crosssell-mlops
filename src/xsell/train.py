"""Training orchestration: clean → fit → evaluate → persist (+ MLflow)."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import numpy as np

from xsell import data as data_module
from xsell.config import Settings
from xsell.evaluate import Evaluation, best_threshold, evaluate
from xsell.features import build_pipeline, clean_frame, positive_scores
from xsell.registry import build_bundle, save_bundle

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
_LOCAL_SCHEMES = {"sqlite", "file"}


def _prepare(settings: Settings):
    train_set, test_set = data_module.load_datasets(settings)
    train_frame = clean_frame(
        train_set.features.assign(**{settings.data.target: train_set.target}),
        settings,
        training=True,
    )
    test_frame = clean_frame(
        test_set.features.assign(**{settings.data.target: test_set.target}),
        settings,
        training=False,
    )

    target = settings.data.target
    train_x = train_frame.drop(columns=[target])
    train_y = train_frame[target].astype(int)
    test_x = test_frame.drop(columns=[target])
    test_y = test_frame[target].astype(int)
    return train_x, train_y, test_x, test_y


def train(settings: Settings, *, tune_threshold: bool = True) -> tuple[Any, Evaluation]:
    """Fit the configured pipeline and return it with its test-set evaluation."""
    train_x, train_y, test_x, test_y = _prepare(settings)
    logger.info("training rows=%s test rows=%s", len(train_x), len(test_x))

    pipeline = build_pipeline(settings)
    pipeline.fit(train_x, train_y)

    scores = positive_scores(pipeline, test_x)
    threshold = settings.model.decision_threshold
    if tune_threshold:
        threshold = best_threshold(scores, np.asarray(test_y))

    evaluation = evaluate(scores, np.asarray(test_y), threshold)
    logger.info(
        "roc_auc=%.4f f1=%.4f threshold=%.3f",
        evaluation.roc_auc,
        evaluation.f1,
        evaluation.threshold,
    )
    return pipeline, evaluation


def train_and_save(settings: Settings, *, tune_threshold: bool = True) -> Evaluation:
    pipeline, evaluation = train(settings, tune_threshold=tune_threshold)

    settings.model.decision_threshold = evaluation.threshold
    bundle = build_bundle(pipeline, settings, evaluation.as_metrics())
    artifact = save_bundle(bundle, settings.artifact_path)
    logger.info("artifact written to %s (version %s)", artifact, bundle.version)

    if settings.tracking.enabled:
        _log_to_mlflow(settings, pipeline, evaluation, bundle.version)

    return evaluation


def _tracking_uri(settings: Settings) -> str | None:
    """Absolute tracking URI for local backends, or ``None`` for MLflow's default.

    Relative ``sqlite:``/``file:`` URIs are resolved against the repository root
    so the store always lands in one place no matter which directory the caller
    ran from. ``MLFLOW_TRACKING_URI`` always wins, which is how a shared tracking
    server (Docker, remote) is injected without editing the config.
    """
    if os.environ.get("MLFLOW_TRACKING_URI"):
        return None

    uri = settings.tracking.tracking_uri.strip()
    if not uri:
        return None

    scheme, sep, path = uri.partition(":///")
    if not sep or scheme not in _LOCAL_SCHEMES or not path or "?" in path:
        return uri

    candidate = Path(path)
    if candidate.is_absolute():
        return uri
    return f"{scheme}:///{(REPO_ROOT / candidate).resolve().as_posix()}"


def _log_to_mlflow(settings: Settings, pipeline, evaluation: Evaluation, version: str) -> None:
    try:
        import mlflow
        import mlflow.sklearn
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("mlflow is not installed; skipping tracking")
        return

    tracking_uri = _tracking_uri(settings)
    if tracking_uri:
        mlflow.set_tracking_uri(tracking_uri)
    logger.info("mlflow tracking uri: %s", mlflow.get_tracking_uri())

    mlflow.set_experiment(settings.tracking.experiment)
    # Alembic's fileConfig (run when the sqlite store is bootstrapped) disables
    # loggers that already exist, which would silently swallow the tracking
    # lines below. Re-enable ours.
    logger.disabled = False

    with mlflow.start_run() as run:
        mlflow.log_params({"algorithm": settings.model.algorithm, **settings.model.params})
        mlflow.log_metrics(evaluation.as_metrics())
        mlflow.log_dict(
            {
                "features": settings.feature_columns,
                "threshold": evaluation.threshold,
            },
            "model_contract.json",
        )
        mlflow.sklearn.log_model(pipeline, artifact_path="model")
        try:
            registered = mlflow.register_model(
                f"runs:/{run.info.run_id}/model", settings.tracking.registered_model
            )
        except Exception as exc:  # pragma: no cover - registry unavailable
            logger.warning("model registration skipped: %s", exc)
        else:
            logger.info("registered model %s v%s", registered.name, registered.version)
            mlflow.set_tag("registered_model_version", str(registered.version))
        mlflow.set_tag("artifact_version", version)
        logger.info("mlflow run %s logged", run.info.run_id)
