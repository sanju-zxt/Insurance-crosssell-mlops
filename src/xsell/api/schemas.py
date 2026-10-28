"""Request and response contract for the prediction API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CustomerFeatures(BaseModel):
    """One policyholder, shaped like the training features."""

    model_config = ConfigDict(extra="forbid")

    Gender: Literal["Male", "Female"] = Field(description="Policyholder gender")
    Age: float = Field(ge=18, le=100, description="Age in years")
    HasDrivingLicense: int = Field(ge=0, le=1, description="1 if licensed, else 0")
    RegionID: float = Field(ge=0, description="Anonymised region code")
    Switch: int = Field(ge=-1, le=1, description="Prior insurer switch indicator")
    VehicleAge: Literal["< 1 Year", "1-2 Year", "> 2 Years"] = Field(description="Age of vehicle")
    PastAccident: Literal["Yes", "No", "Unknown"] = Field(description="Any past claim")
    AnnualPremium: float = Field(gt=0, description="Current annual premium")
    SalesChannelID: float = Field(ge=0, description="Sales channel identifier")
    DaysSinceCreated: float = Field(ge=0, description="Days since policy created")


class Prediction(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    will_cross_sell: bool
    probability: float = Field(ge=0, le=1)
    threshold: float
    model_version: str


class BatchRequest(BaseModel):
    customers: list[CustomerFeatures] = Field(min_length=1, max_length=500)


class BatchPrediction(BaseModel):
    predictions: list[Prediction]
    count: int


class ModelInfo(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    project: str
    model_version: str
    trained_at: str
    threshold: float
    features: list[str]
    metrics: dict[str, float]


class Health(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: Literal["ok", "degraded"]
    model_loaded: bool
    detail: str | None = None
