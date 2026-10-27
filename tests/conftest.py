"""Shared fixtures: a tiny synthetic table and a fitted model bundle."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from xsell.config import load_settings  # noqa: E402
from xsell.features import build_pipeline  # noqa: E402
from xsell.registry import build_bundle  # noqa: E402


@pytest.fixture(scope="session")
def settings():
    return load_settings(ROOT / "configs" / "base.yml")


def _synthetic_frame(rows: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    frame = pd.DataFrame(
        {
            "id": np.arange(rows),
            "Gender": rng.choice(["Male", "Female"], rows),
            "Age": rng.integers(20, 70, rows).astype(float),
            "HasDrivingLicense": rng.integers(0, 2, rows).astype(float),
            "RegionID": rng.integers(1, 40, rows).astype(float),
            "Switch": rng.integers(-1, 2, rows).astype(float),
            "VehicleAge": rng.choice(["< 1 Year", "1-2 Year", "> 2 Years"], rows),
            "PastAccident": rng.choice(["Yes", "No", "Unknown"], rows),
            "AnnualPremium": rng.uniform(500, 5000, rows),
            "SalesChannelID": rng.integers(1, 160, rows),
            "DaysSinceCreated": rng.integers(1, 300, rows),
        }
    )
    score = (
        0.02 * frame["AnnualPremium"]
        + 0.03 * frame["Age"]
        - 0.4 * (frame["Gender"] == "Male").astype(int)
        - rng.normal(0, 1.0, rows)
    )
    frame["Result"] = (score > score.median()).astype(int)
    return frame


@pytest.fixture(scope="session")
def frame() -> pd.DataFrame:
    return _synthetic_frame(600, seed=7)


@pytest.fixture(scope="session")
def bundle(settings, tmp_path_factory):
    """A real (small) fitted pipeline so the API tests exercise genuine inference."""
    frame = _synthetic_frame(600, seed=11)
    target = settings.data.target
    train_x = frame[settings.feature_columns]
    train_y = frame[target].astype(int)

    pipeline = build_pipeline(settings)
    pipeline.fit(train_x, train_y)

    return build_bundle(
        pipeline,
        settings,
        {"accuracy": 0.9, "roc_auc": 0.95, "f1": 0.9, "threshold": 0.5},
        version="test-bundle",
    )
