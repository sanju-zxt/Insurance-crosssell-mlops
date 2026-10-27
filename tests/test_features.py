"""Cleaning, currency parsing and the fitted preprocessing graph."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from xsell.data import SchemaError, read_table, to_dataset, validate_columns
from xsell.features import build_pipeline, clean_frame, parse_currency, positive_scores


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("£1,416.50 ", 1416.50),
        ("£1,234.25", 1234.25),
        ("1,234.25", 1234.25),
        ("£90.00", 90.0),
        ("", None),
        ("-", None),
        (None, None),
    ],
)
def test_parse_currency_handles_messy_values(raw, expected):
    series = pd.Series([raw], dtype="object")
    value = parse_currency(series).iloc[0]
    if expected is None:
        assert pd.isna(value)
    else:
        assert value == pytest.approx(expected)


def test_parse_currency_survives_single_byte_glyph():
    # 0xA3 is £ in latin-1 but renders as a stray character under the wrong codec.
    series = pd.Series([b"\xa31,000.00".decode("latin-1")])
    assert parse_currency(series).iloc[0] == pytest.approx(1000.0)


def test_clean_frame_parses_premium_and_drops_identifiers(frame, settings):
    cleaned = clean_frame(frame, settings, training=True)
    for column in settings.data.drop_columns:
        assert column not in cleaned.columns
    assert cleaned["AnnualPremium"].dtype.kind == "f"
    assert cleaned[settings.data.target].notna().all()


def test_outlier_trim_only_happens_during_training(frame, settings):
    noisy = frame.copy()
    noisy.loc[0, "AnnualPremium"] = 10_000_000.0

    trained = clean_frame(noisy, settings, training=True)
    serving = clean_frame(noisy, settings, training=False)

    assert len(trained) < len(serving)
    assert 10_000_000.0 not in trained["AnnualPremium"].to_numpy()


def test_validate_columns_reports_missing(settings):
    with pytest.raises(SchemaError, match="missing required columns"):
        validate_columns(pd.DataFrame({"Age": [30]}), settings)


def test_to_dataset_keeps_config_column_order(frame, settings):
    dataset = to_dataset(frame, settings)
    assert list(dataset.features.columns) == settings.feature_columns
    assert len(dataset) == len(frame)


def test_read_table_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        read_table(tmp_path / "absent.csv", "utf-8")


def test_pipeline_fits_and_scores_probabilities(frame, settings):
    pipeline = build_pipeline(settings)
    pipeline.fit(frame[settings.feature_columns], frame[settings.data.target].astype(int))

    scores = positive_scores(pipeline, frame[settings.feature_columns].head(25))

    assert scores.shape == (25,)
    assert np.all((scores >= 0) & (scores <= 1))


def test_pipeline_tolerates_unseen_categories(frame, settings):
    pipeline = build_pipeline(settings)
    pipeline.fit(frame[settings.feature_columns], frame[settings.data.target].astype(int))

    unseen = frame[settings.feature_columns].head(3).copy()
    unseen["Gender"] = "Female"
    unseen["PastAccident"] = "Unknown"
    unseen.loc[unseen.index[0], "Gender"] = "Male"

    assert positive_scores(pipeline, unseen).shape == (3,)


def test_pipeline_handles_missing_values_at_inference(frame, settings):
    pipeline = build_pipeline(settings)
    pipeline.fit(frame[settings.feature_columns], frame[settings.data.target].astype(int))

    holed = frame[settings.feature_columns].head(4).copy()
    holed.loc[holed.index[0], "Age"] = np.nan
    holed.loc[holed.index[1], "PastAccident"] = None

    scores = positive_scores(pipeline, holed)
    assert np.isfinite(scores).all()
