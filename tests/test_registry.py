"""Artifact round-trip and metadata sidecar."""

from __future__ import annotations

import json

import pytest

from xsell.registry import build_bundle, load_bundle, read_metadata, resolve_artifact, save_bundle


def test_save_and_load_round_trip(tmp_path, bundle):
    artifact = tmp_path / "model.joblib"
    save_bundle(bundle, artifact)

    assert artifact.exists()
    reloaded = load_bundle(artifact)
    assert reloaded.version == bundle.version
    assert reloaded.features == bundle.features
    assert reloaded.threshold == bundle.threshold


def test_metadata_sidecar_is_written(tmp_path, bundle):
    artifact = tmp_path / "model.joblib"
    save_bundle(bundle, artifact)

    metadata = read_metadata(artifact)
    assert metadata["version"] == bundle.version
    assert metadata["features"] == bundle.features
    assert "sklearn_version" in metadata

    on_disk = json.loads((tmp_path / "metadata.json").read_text(encoding="utf-8"))
    assert on_disk == metadata


def test_read_metadata_without_sidecar_returns_empty(tmp_path):
    assert read_metadata(tmp_path / "nothing.joblib") == {}


def test_load_missing_artifact_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_bundle(tmp_path / "absent.joblib")


def test_build_bundle_stamps_versions(bundle, settings):
    assert bundle.version.startswith("test-bundle")
    assert bundle.trained_at
    assert bundle.sklearn_version


def test_resolve_artifact_prefers_override(settings, tmp_path):
    override = tmp_path / "custom.joblib"
    assert resolve_artifact(settings, str(override)) == override


def test_resolve_artifact_uses_env(settings, monkeypatch, tmp_path):
    target = tmp_path / "from-env.joblib"
    monkeypatch.setenv("XSELL_MODEL_PATH", str(target))
    assert resolve_artifact(settings) == target


def test_resolve_artifact_falls_back_to_config(settings, monkeypatch):
    monkeypatch.delenv("XSELL_MODEL_PATH", raising=False)
    assert resolve_artifact(settings) == settings.artifact_path
