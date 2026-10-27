"""Frame cleaning plus the sklearn preprocessing graph.

Cleaning is deliberately separate from the estimator pipeline: it is a table
level concern (parse currency, drop rows) while imputation/scaling/encoding must
live inside the fitted pipeline so that inference applies the exact same
transformations the model was trained on.
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, StandardScaler

from xsell.config import Settings

_NUMERIC_NOISE = re.compile(r"[^0-9.\-]")


def parse_currency(series: pd.Series) -> pd.Series:
    """Turn ``"£1,416.50 "`` style values into floats.

    Handles a leading currency glyph, thousands separators, stray whitespace and
    the single-byte mis-decoding (``0xA3``) that shows up as another character
    when the file is read with the wrong encoding.
    """
    cleaned = (
        series.astype("string")
        .str.replace(_NUMERIC_NOISE, "", regex=True)
        .replace({"": None, "-": None})
    )
    return pd.to_numeric(cleaned, errors="coerce")


def drop_outliers(frame: pd.DataFrame, column: str, iqr_factor: float) -> pd.DataFrame:
    """Trim rows whose value sits above ``Q3 + iqr_factor * IQR``."""
    values = frame[column].dropna()
    if values.empty:
        return frame
    q1, q3 = values.quantile([0.25, 0.75])
    upper_bound = q3 + iqr_factor * (q3 - q1)
    return frame.loc[frame[column].isna() | (frame[column] <= upper_bound)].reset_index(drop=True)


def clean_frame(
    frame: pd.DataFrame,
    settings: Settings,
    *,
    training: bool = False,
) -> pd.DataFrame:
    """Prepare a raw table for the estimator.

    ``training=True`` allows row-dropping steps (outlier trim) that must never be
    applied at inference time, otherwise a legitimate high-value customer would
    silently disappear from a prediction batch.
    """
    data = frame.copy()

    premium = settings.data.premium_column
    if premium in data.columns:
        data[premium] = parse_currency(data[premium])

    keep = [column for column in data.columns if column not in settings.data.drop_columns]
    data = data.loc[:, keep]

    outlier = settings.data.outlier
    should_trim = outlier.enabled and training and premium in data.columns
    if should_trim or (outlier.enabled and not outlier.train_only and premium in data.columns):
        data = drop_outliers(data, premium, outlier.iqr_factor)

    return data


def build_preprocessor(settings: Settings) -> ColumnTransformer:
    """Assemble imputation + scaling + encoding from the config."""
    pre = settings.preprocessing
    impute_strategy = pre.impute_strategy

    transformers: list[tuple[str, Pipeline, list[str]]] = []

    if pre.standard_scale:
        transformers.append(
            (
                "standard",
                Pipeline(
                    steps=[
                        ("impute", SimpleImputer(strategy=impute_strategy)),
                        ("scale", StandardScaler()),
                    ]
                ),
                pre.standard_scale,
            )
        )

    if pre.minmax_scale:
        transformers.append(
            (
                "minmax",
                Pipeline(
                    steps=[
                        ("impute", SimpleImputer(strategy=impute_strategy)),
                        ("scale", MinMaxScaler()),
                    ]
                ),
                pre.minmax_scale,
            )
        )

    if pre.categorical:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    steps=[
                        (
                            "impute",
                            SimpleImputer(strategy=impute_strategy, fill_value="Unknown"),
                        ),
                        (
                            "encode",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                        ),
                    ]
                ),
                pre.categorical,
            )
        )

    if pre.passthrough:
        transformers.append(
            (
                "passthrough",
                Pipeline(
                    steps=[("impute", SimpleImputer(strategy=impute_strategy))]
                ),
                pre.passthrough,
            )
        )

    if not transformers:
        raise ValueError("no feature groups configured under preprocessing")

    return ColumnTransformer(transformers=transformers, remainder="drop", verbose_feature_names_out=False)


def make_estimator(settings: Settings):
    """Instantiate the configured classifier."""
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.tree import DecisionTreeClassifier

    catalogue = {
        "gradient_boosting": GradientBoostingClassifier,
        "random_forest": RandomForestClassifier,
        "decision_tree": DecisionTreeClassifier,
        "logistic_regression": LogisticRegression,
    }
    params = dict(settings.model.params)
    params.setdefault("random_state", settings.seed)
    if settings.model.algorithm == "logistic_regression":
        params.setdefault("max_iter", 1000)
    return catalogue[settings.model.algorithm](**params)


class ConditionalSMOTE:
    """SMOTE wrapper that becomes a no-op when the classes are already balanced.

    Vanilla SMOTE raises ``ValueError`` on an already-balanced target, which
    turns a harmless dataset quirk into a training crash. Skipping the resample
    is the correct behaviour there.

    Defined at module level (not inside a factory) so the fitted pipeline stays
    picklable for artifact saving.
    """

    def __init__(self, strategy: float, seed: int) -> None:
        self.strategy = strategy
        self.seed = seed
        self._inner = None

    def _sampler(self):
        if self._inner is None:
            from imblearn.over_sampling import SMOTE

            self._inner = SMOTE(sampling_strategy=self.strategy, random_state=self.seed)
        return self._inner

    def fit_resample(self, X, y):
        counts = np.unique(np.asarray(y), return_counts=True)[1]
        if counts.size < 2:
            return X, y
        minority, majority = counts.min(), counts.max()
        if isinstance(self.strategy, float) and self.strategy * majority <= minority:
            return X, y
        return self._sampler().fit_resample(X, y)

    def fit(self, X, y):
        self.fit_resample(X, y)
        return self

    def get_params(self, deep: bool = True) -> dict:
        return {"strategy": self.strategy, "seed": self.seed}

    def set_params(self, **params):
        for key, value in params.items():
            setattr(self, key, value)
        self._inner = None
        return self


def build_pipeline(settings: Settings):
    """preprocessor → optional resampler → estimator.

    ``imblearn`` is only imported when balancing is switched on, so a plain
    sklearn setup does not need it installed.
    """
    preprocessor = build_preprocessor(settings)
    estimator = make_estimator(settings)

    if not settings.preprocessing.balance.enabled:
        return Pipeline(steps=[("preprocessor", preprocessor), ("model", estimator)])

    from imblearn.pipeline import Pipeline as ImbPipeline

    sampler = ConditionalSMOTE(settings.preprocessing.balance.sampling_strategy, settings.seed)
    return ImbPipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("sampler", sampler),
            ("model", estimator),
        ]
    )


def positive_scores(pipeline, features: pd.DataFrame) -> np.ndarray:
    """Return P(class 1) as a flat float array for any estimator shape."""
    if hasattr(pipeline, "predict_proba"):
        proba = pipeline.predict_proba(features)
        return np.asarray(proba)[:, 1]
    return np.asarray(pipeline.predict(features), dtype=float)
