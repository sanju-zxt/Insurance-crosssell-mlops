"""Train the cross-sell model.

Usage:
    python pipelines/train.py                # uses configs/base.yml
    python pipelines/train.py --config x.yml
    python pipelines/train.py --mlflow       # enable experiment tracking
    python pipelines/train.py --no-threshold-tune
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from xsell.config import load_settings  # noqa: E402
from xsell.train import train_and_save  # noqa: E402


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the cross-sell propensity model")
    parser.add_argument("--config", default="configs/base.yml", help="path to the YAML config")
    parser.add_argument("--mlflow", action="store_true", help="log the run to MLflow")
    parser.add_argument(
        "--no-threshold-tune",
        action="store_true",
        help="keep the configured decision threshold instead of tuning F1",
    )
    parser.add_argument("--quiet", action="store_true", help="suppress progress logging")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.WARNING if args.quiet else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(message)s",
        datefmt="%H:%M:%S",
    )

    settings = load_settings(args.config)
    settings.tracking.enabled = settings.tracking.enabled or args.mlflow

    evaluation = train_and_save(settings, tune_threshold=not args.no_threshold_tune)

    print("\n=== evaluation ===")
    print(json.dumps(evaluation.as_metrics(), indent=2))
    print(f"artifact: {settings.artifact_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
