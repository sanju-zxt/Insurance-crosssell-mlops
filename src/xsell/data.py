"""Reading the raw tables and splitting features from the target."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from xsell.config import Settings


class SchemaError(ValueError):
    """Raised when a table is missing columns the model needs."""


@dataclass(frozen=True)
class Dataset:
    features: pd.DataFrame
    target: pd.Series

    def __len__(self) -> int:
        return len(self.features)


def read_table(path: str | Path, encoding: str) -> pd.DataFrame:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"data file not found: {file_path}")
    return pd.read_csv(file_path, encoding=encoding, low_memory=False)


def validate_columns(frame: pd.DataFrame, settings: Settings) -> None:
    required = set(settings.feature_columns) | {settings.data.target}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise SchemaError(
            "missing required columns: " + ", ".join(missing) + f" (present: {len(frame.columns)})"
        )


def to_dataset(frame: pd.DataFrame, settings: Settings) -> Dataset:
    validate_columns(frame, settings)
    columns = settings.feature_columns
    return Dataset(features=frame.loc[:, columns].copy(), target=frame[settings.data.target].copy())


def load_datasets(settings: Settings) -> tuple[Dataset, Dataset]:
    """Load the train and test tables declared in the config."""
    train_frame = read_table(settings.data.train_path, settings.data.encoding)
    test_frame = read_table(settings.data.test_path, settings.data.encoding)
    return to_dataset(train_frame, settings), to_dataset(test_frame, settings)
