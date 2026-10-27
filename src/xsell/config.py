"""Typed configuration for the cross-sell pipeline.

Every knob lives in ``configs/base.yml`` and is validated here on load, so a
typo or a wrong type fails at startup instead of deep inside training.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, field_validator

DEFAULT_CONFIG_PATH = Path("configs/base.yml")

Algorithm = Literal["gradient_boosting", "random_forest", "decision_tree", "logistic_regression"]


class OutlierConfig(BaseModel):
    enabled: bool = True
    iqr_factor: float = 1.5
    train_only: bool = True


class DataConfig(BaseModel):
    train_path: Path = Path("data/train.csv")
    test_path: Path = Path("data/test.csv")
    encoding: str = "latin-1"
    target: str = "Result"
    drop_columns: list[str] = Field(default_factory=list)
    premium_column: str = "AnnualPremium"
    outlier: OutlierConfig = Field(default_factory=OutlierConfig)


class BalanceConfig(BaseModel):
    enabled: bool = True
    sampling_strategy: float = 1.0


class PreprocessingConfig(BaseModel):
    impute_strategy: Literal["mean", "median", "most_frequent", "constant"] = "most_frequent"
    standard_scale: list[str] = Field(default_factory=list)
    minmax_scale: list[str] = Field(default_factory=list)
    categorical: list[str] = Field(default_factory=list)
    passthrough: list[str] = Field(default_factory=list)
    balance: BalanceConfig = Field(default_factory=BalanceConfig)


class ModelConfig(BaseModel):
    algorithm: Algorithm = "gradient_boosting"
    params: dict[str, Any] = Field(default_factory=dict)
    decision_threshold: float = 0.5
    artifact_dir: Path = Path("models")
    artifact_name: str = "model.joblib"

    @field_validator("decision_threshold")
    @classmethod
    def _threshold_in_range(cls, value: float) -> float:
        if not 0.0 < value < 1.0:
            raise ValueError("decision_threshold must sit strictly between 0 and 1")
        return value


class TrackingConfig(BaseModel):
    enabled: bool = False
    experiment: str = "xsell-propensity"
    registered_model: str = "xsell_propensity"
    tracking_uri: str = ""


class Settings(BaseModel):
    project: str = "insurance-crosssell-mlops"
    seed: int = 42
    data: DataConfig = Field(default_factory=DataConfig)
    preprocessing: PreprocessingConfig = Field(default_factory=PreprocessingConfig)
    model: ModelConfig = Field(default_factory=ModelConfig)
    tracking: TrackingConfig = Field(default_factory=TrackingConfig)

    @property
    def feature_columns(self) -> list[str]:
        """Model inputs, in a stable order, derived from the config."""
        pre = self.preprocessing
        ordered: list[str] = []
        for group in (pre.standard_scale, pre.minmax_scale, pre.categorical, pre.passthrough):
            for column in group:
                if column not in ordered:
                    ordered.append(column)
        return ordered

    @property
    def artifact_path(self) -> Path:
        return self.model.artifact_dir / self.model.artifact_name


def load_settings(path: str | Path | None = None) -> Settings:
    """Read a YAML file and validate it into :class:`Settings`."""
    config_path = Path(path) if path is not None else DEFAULT_CONFIG_PATH
    if not config_path.exists():
        raise FileNotFoundError(f"config not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as handle:
        raw = yaml.safe_load(handle) or {}

    if not isinstance(raw, dict):
        raise ValueError(f"config root must be a mapping, got {type(raw).__name__}")

    return Settings.model_validate(raw)
