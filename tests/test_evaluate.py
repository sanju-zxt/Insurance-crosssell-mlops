"""Metric computation and threshold search."""

from __future__ import annotations

import numpy as np

from xsell.evaluate import best_threshold, evaluate


def test_evaluate_reports_all_metrics():
    truth = np.array([0, 0, 1, 1, 1, 0, 1, 0])
    scores = np.array([0.1, 0.2, 0.8, 0.9, 0.6, 0.3, 0.7, 0.15])

    result = evaluate(scores, truth, 0.5)

    assert result.accuracy == 1.0
    assert result.roc_auc == 1.0
    assert result.f1 == 1.0
    assert result.threshold == 0.5
    assert set(result.as_metrics()) >= {"accuracy", "roc_auc", "precision", "recall", "f1"}


def test_threshold_shift_changes_predictions():
    truth = np.array([0, 0, 1, 1])
    scores = np.array([0.1, 0.2, 0.6, 0.9])

    low = evaluate(scores, truth, 0.3)
    high = evaluate(scores, truth, 0.65)

    assert low.recall > high.recall
    assert high.precision >= low.precision


def test_best_threshold_lands_inside_unit_interval():
    rng = np.random.default_rng(3)
    truth = (rng.random(500) > 0.5).astype(int)
    scores = np.clip(truth * 0.5 + rng.random(500) * 0.5, 0, 1)

    threshold = best_threshold(scores, truth)

    assert 0.0 < threshold < 1.0
    assert round(threshold, 3) == threshold


def test_best_threshold_beats_default_threshold_on_separable_data():
    truth = np.array([0] * 50 + [1] * 50)
    scores = np.concatenate([np.linspace(0.05, 0.4, 50), np.linspace(0.6, 0.95, 50)])

    tuned = evaluate(scores, truth, best_threshold(scores, truth))

    assert tuned.f1 == 1.0
    assert tuned.as_metrics()["threshold"] > 0.4
