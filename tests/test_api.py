"""API contract tests against a real fitted pipeline."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from xsell.api.main import ModelService, create_app

VALID_CUSTOMER = {
    "Gender": "Female",
    "Age": 35.0,
    "HasDrivingLicense": 1,
    "RegionID": 28.0,
    "Switch": 0,
    "VehicleAge": "< 1 Year",
    "PastAccident": "No",
    "AnnualPremium": 1416.5,
    "SalesChannelID": 152,
    "DaysSinceCreated": 200,
}


@pytest.fixture()
def client(settings, bundle):
    app = create_app(settings=settings, service=ModelService(bundle))
    with TestClient(app) as test_client:
        yield test_client


def test_health_reports_ok(client):
    payload = client.get("/health").json()
    assert payload["status"] == "ok"
    assert payload["model_loaded"] is True


def test_health_degrades_without_model(settings):
    app = create_app(settings=settings, service=ModelService(None, "FileNotFoundError: nope"))
    with TestClient(app) as test_client:
        response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"


def test_predict_returns_probability_and_flag(client):
    response = client.post("/predict", json=VALID_CUSTOMER)
    assert response.status_code == 200

    body = response.json()
    assert 0.0 <= body["probability"] <= 1.0
    assert isinstance(body["will_cross_sell"], bool)
    assert body["model_version"] == "test-bundle"
    assert 0.0 < body["threshold"] < 1.0


def test_predict_rejects_out_of_range_age(client):
    bad = dict(VALID_CUSTOMER, Age=5)
    assert client.post("/predict", json=bad).status_code == 422


def test_predict_rejects_unknown_field(client):
    bad = dict(VALID_CUSTOMER, Sneaky=1)
    assert client.post("/predict", json=bad).status_code == 422


def test_predict_rejects_bad_category(client):
    bad = dict(VALID_CUSTOMER, PastAccident="Maybe")
    assert client.post("/predict", json=bad).status_code == 422


def test_batch_prediction_matches_single(client):
    customers = [VALID_CUSTOMER, dict(VALID_CUSTOMER, Age=61.0, Gender="Male")]
    response = client.post("/predict/batch", json={"customers": customers})

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2

    single = client.post("/predict", json=VALID_CUSTOMER).json()
    assert body["predictions"][0]["probability"] == pytest.approx(single["probability"])


def test_batch_rejects_empty_payload(client):
    assert client.post("/predict/batch", json={"customers": []}).status_code == 422


def test_model_info_exposes_contract(client, settings):
    body = client.get("/model/info").json()
    assert body["features"] == settings.feature_columns
    assert body["model_version"] == "test-bundle"
    assert "roc_auc" in body["metrics"]


def test_prediction_endpoints_fail_cleanly_without_model(settings):
    app = create_app(settings=settings, service=ModelService(None, "balloon"))
    with TestClient(app) as test_client:
        response = test_client.post("/predict", json=VALID_CUSTOMER)
    assert response.status_code == 503
    assert "model not loaded" in response.json()["detail"]
