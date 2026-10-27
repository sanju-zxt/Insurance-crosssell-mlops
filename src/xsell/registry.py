"""Artifact persistence.

A saved bundle carries more than the estimator: the feature order, the decision
threshold and the metric snapshot are stored next to it, so a serving process
never has to guess how the model was built.
"""

from __future__ import annotations

import json
import os
import platform
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

from xsell.config import Settings


@dataclass
class ModelBundle:
    pipeline: Any
    features: list[str]
    threshold: float
    version: str
    metrics: dict[str, float]
    trained_at: str
    sklearn_version: str

    def to_metadata(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "features": self.features,
            "threshold": self.threshold,
            "metrics": self.metrics,
            "trained_at": self.trained_at,
            "sklearn_version": self.sklearn_version,
            "python_version": platform.python_version(),
        }


def _metadata_path(artifact: Path) -> Path:
    """Sidecar named after the artifact, so several models can share a folder."""
    return artifact.with_name(f"{artifact.stem}.metadata.json")


def save_bundle(bundle: ModelBundle, artifact: Path) -> Path:
    artifact.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, artifact, compress=3)
    _metadata_path(artifact).write_text(
        json.dumps(bundle.to_metadata(), indent=2), encoding="utf-8"
    )
    return artifact


def load_bundle(artifact: Path) -> ModelBundle:
    if not artifact.exists():
        raise FileNotFoundError(f"model artifact not found: {artifact}")
    return joblib.load(artifact)


def read_metadata(artifact: Path) -> dict[str, Any]:
    path = _metadata_path(artifact)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def build_bundle(
    pipeline: Any,
    settings: Settings,
    metrics: dict[str, float],
    *,
    version: str | None = None,
) -> ModelBundle:
    import sklearn

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return ModelBundle(
        pipeline=pipeline,
        features=settings.feature_columns,
        threshold=settings.model.decision_threshold,
        version=version or f"{settings.project}-{stamp}",
        metrics=metrics,
        trained_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        sklearn_version=sklearn.__version__,
    )


def resolve_artifact(settings: Settings, override: str | None = None) -> Path:
    """Artifact path from the config, or an explicit override (env/CLI)."""
    if override:
        return Path(override)
    env_path = os.getenv("XSELL_MODEL_PATH")
    if env_path:
        return Path(env_path)
    return settings.artifact_path
