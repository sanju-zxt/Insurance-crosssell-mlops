"""FastAPI application factory.

The app is created through :func:`create_app` so tests can inject a fixture
model, and it never crashes on import when the artifact is absent — it reports
``degraded`` on ``/health`` instead, which is what a container orchestrator
needs to make a sensible decision.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException

from xsell import __version__
from xsell.api.schemas import (
    BatchPrediction,
    BatchRequest,
    CustomerFeatures,
    Health,
    ModelInfo,
    Prediction,
)
from xsell.config import Settings, load_settings
from xsell.features import positive_scores
from xsell.registry import ModelBundle, load_bundle, read_metadata, resolve_artifact

logger = logging.getLogger(__name__)


class ModelService:
    """Holds the loaded bundle and turns feature payloads into predictions."""

    def __init__(self, bundle: ModelBundle | None, error: str | None = None) -> None:
        self._bundle = bundle
        self._error = error

    @classmethod
    def from_settings(cls, settings: Settings) -> "ModelService":
        artifact = resolve_artifact(settings)
        try:
            return cls(load_bundle(artifact))
        except Exception as exc:
            logger.warning("model unavailable at %s: %s", artifact, exc)
            return cls(None, f"{type(exc).__name__}: {exc}")

    @property
    def ready(self) -> bool:
        return self._bundle is not None

    @property
    def error(self) -> str | None:
        return self._error

    @property
    def bundle(self) -> ModelBundle:
        if self._bundle is None:
            raise HTTPException(status_code=503, detail=f"model not loaded ({self._error})")
        return self._bundle

    def predict_many(self, customers: list[CustomerFeatures]) -> list[Prediction]:
        bundle = self.bundle
        frame = pd.DataFrame([item.model_dump() for item in customers])
        frame = frame.loc[:, bundle.features]
        scores = positive_scores(bundle.pipeline, frame)
        return [
            Prediction(
                will_cross_sell=bool(score >= bundle.threshold),
                probability=round(float(score), 6),
                threshold=bundle.threshold,
                model_version=bundle.version,
            )
            for score in scores
        ]


@lru_cache(maxsize=1)
def _default_settings() -> Settings:
    return load_settings()


def create_app(settings: Settings | None = None, service: ModelService | None = None) -> FastAPI:
    settings = settings or _default_settings()
    model_service = service or ModelService.from_settings(settings)

    app = FastAPI(
        title="Insurance Cross-Sell Propensity API",
        description="Predicts the likelihood that a policyholder buys a second product.",
        version=__version__,
    )
    app.state.settings = settings
    app.state.model_service = model_service

    def get_service() -> ModelService:
        return app.state.model_service

    @app.get("/health", response_model=Health, tags=["ops"])
    def health(service: ModelService = Depends(get_service)) -> Health:
        if service.ready:
            return Health(status="ok", model_loaded=True)
        return Health(status="degraded", model_loaded=False, detail=service.error)

    @app.get("/model/info", response_model=ModelInfo, tags=["ops"])
    def model_info(service: ModelService = Depends(get_service)) -> ModelInfo:
        bundle = service.bundle
        metadata = read_metadata(resolve_artifact(settings))
        return ModelInfo(
            project=settings.project,
            model_version=bundle.version,
            trained_at=bundle.trained_at,
            threshold=bundle.threshold,
            features=bundle.features,
            metrics=metadata.get("metrics", bundle.metrics),
        )

    @app.post("/predict", response_model=Prediction, tags=["inference"])
    def predict(
        customer: CustomerFeatures,
        service: ModelService = Depends(get_service),
    ) -> Prediction:
        return service.predict_many([customer])[0]

    @app.post("/predict/batch", response_model=BatchPrediction, tags=["inference"])
    def predict_batch(
        payload: BatchRequest,
        service: ModelService = Depends(get_service),
    ) -> BatchPrediction:
        predictions = service.predict_many(payload.customers)
        return BatchPrediction(predictions=predictions, count=len(predictions))

    return app


app = create_app()
