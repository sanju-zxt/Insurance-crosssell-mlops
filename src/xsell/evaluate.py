"""Metrics and decision-threshold selection."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


@dataclass
class Evaluation:
    accuracy: float
    roc_auc: float
    average_precision: float
    precision: float
    recall: float
    f1: float
    threshold: float
    report: dict = field(default_factory=dict)

    def as_metrics(self) -> dict[str, float]:
        return {
            "accuracy": self.accuracy,
            "roc_auc": self.roc_auc,
            "average_precision": self.average_precision,
            "precision": self.precision,
            "recall": self.recall,
            "f1": self.f1,
            "threshold": self.threshold,
        }


def _binarise(scores: np.ndarray, threshold: float) -> np.ndarray:
    return (np.asarray(scores) >= threshold).astype(int)


def best_threshold(scores: np.ndarray, truth: np.ndarray, grid: int = 91) -> float:
    """Pick the threshold that maximises F1 on the supplied scores."""
    candidates = np.linspace(0.05, 0.95, grid)
    best_score = -1.0
    chosen = 0.5
    for candidate in candidates:
        score = f1_score(truth, _binarise(scores, float(candidate)), zero_division=0)
        if score > best_score:
            best_score, chosen = score, float(candidate)
    return round(chosen, 3)


def evaluate(scores: np.ndarray, truth: np.ndarray, threshold: float) -> Evaluation:
    predictions = _binarise(scores, threshold)
    return Evaluation(
        accuracy=float(accuracy_score(truth, predictions)),
        roc_auc=float(roc_auc_score(truth, scores)),
        average_precision=float(average_precision_score(truth, scores)),
        precision=float(precision_score(truth, predictions, zero_division=0)),
        recall=float(recall_score(truth, predictions, zero_division=0)),
        f1=float(f1_score(truth, predictions, zero_division=0)),
        threshold=float(threshold),
        report=classification_report(truth, predictions, output_dict=True, zero_division=0),
    )
