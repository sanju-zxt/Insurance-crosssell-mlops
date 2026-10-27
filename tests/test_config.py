"""Config loading and derived values."""

from __future__ import annotations

import pytest

from xsell.config import Settings, load_settings


def test_loads_checked_in_config(settings):
    assert settings.project == "insurance-crosssell-mlops"
    assert settings.data.target == "Result"
    assert settings.model.algorithm


def test_feature_columns_follow_config_order(settings):
    expected = [
        "Age",
        "RegionID",
        "AnnualPremium",
        "Gender",
        "PastAccident",
        "HasDrivingLicense",
        "Switch",
    ]
    assert settings.feature_columns == expected


def test_feature_columns_are_deduplicated():
    settings = Settings.model_validate(
        {
            "preprocessing": {
                "standard_scale": ["Age"],
                "minmax_scale": ["Age"],
                "categorical": [],
                "passthrough": [],
            }
        }
    )
    assert settings.feature_columns == ["Age"]


def test_artifact_path_joins_dir_and_name(settings):
    assert settings.artifact_path == settings.model.artifact_dir / settings.model.artifact_name


def test_threshold_outside_unit_interval_is_rejected():
    with pytest.raises(ValueError):
        Settings.model_validate({"model": {"decision_threshold": 1.5}})


def test_missing_config_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_settings(tmp_path / "nope.yml")


def test_non_mapping_config_is_rejected(tmp_path):
    path = tmp_path / "bad.yml"
    path.write_text("- just\n- a\n- list\n", encoding="utf-8")
    with pytest.raises(ValueError, match="mapping"):
        load_settings(path)


def test_empty_config_falls_back_to_defaults(tmp_path):
    path = tmp_path / "empty.yml"
    path.write_text("", encoding="utf-8")
    loaded = load_settings(path)
    assert loaded.feature_columns == []
    assert loaded.data.target == "Result"
