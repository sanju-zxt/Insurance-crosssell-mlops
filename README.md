# Insurance Cross-Sell Propensity — MLOps Reference Pipeline

Predicting which policyholders are likely to buy a second insurance product,
wrapped in a reproducible train → serve → monitor loop.

- **Training**: scikit-learn pipeline (impute → scale → one-hot → SMOTE → classifier)
- **Experiment tracking**: MLflow (optional, opt-in)
- **Serving**: FastAPI with a typed request/response contract
- **Packaging**: Docker + docker-compose
- **Quality**: pytest unit + API tests

## Architecture

```mermaid
flowchart LR
    A[data/train.csv] --> B[clean frame]
    B --> C[ColumnTransformer<br/>impute · scale · one-hot]
    C --> D[SMOTE balance]
    D --> E[classifier]
    E --> F[(models/model.joblib)]
    F --> G[FastAPI /predict]
    A -.-> H[data/test.csv]
    H --> I[evaluate + MLflow log]
```

## Quick start

```bash
git clone https://github.com/sanju-zxt/Insurance-crosssell-mlops.git
cd Insurance-crosssell-mlops

python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux / macOS

pip install -r requirements.txt
```

### Train

```bash
python pipelines/train.py
# or with experiment tracking
python pipelines/train.py --mlflow
```

The artifact lands in `models/model.joblib` together with
`models/model.metadata.json` (metrics, feature order, decision threshold, library
versions). The sidecar is named after the artifact, so several models can live in
`models/` at once — e.g. `model-logistic.joblib` + `model-logistic.metadata.json`.

### Track experiments

`--mlflow` logs params/metrics/model and registers a model version, using the store
configured in `configs/base.yml` (`tracking_uri: sqlite:///mlflow.db`, resolved
against the repository root). A database store is required: the MLflow **model
registry does not work on a plain `file:` store**.

```bash
pip install -r requirements-tracking.txt                       # mlflow 2.14.3 (+ setuptools<81, sqlalchemy<2.1)
python pipelines/train.py --mlflow                             # run + registered version
python -m mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5000
```

Then open http://127.0.0.1:5000. Each run creates a new version of the registered
model `xsell_propensity`. Point `MLFLOW_TRACKING_URI` at a tracking server (the
`mlflow` service in `docker-compose.yml`, which also binds port 5000 — run it *or*
the local UI, not both) to keep results off the local disk; `mlflow.db` and
`mlruns/` are gitignored.

### Serve

```bash
uvicorn xsell.api.main:app --app-dir src --reload
```

Open http://127.0.0.1:8000/docs for the interactive schema.

```bash
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{
  "Gender": "Female",
  "Age": 35,
  "HasDrivingLicense": 1,
  "RegionID": 28,
  "Switch": 0,
  "PastAccident": "No",
  "AnnualPremium": 1416.5
}'
```

### Docker

The image ships the trained artifact, so train first (or mount your own
`models/` over it):

```bash
python pipelines/train.py          # produces models/model.joblib
docker build -t xsell-api .
docker run -p 8000:8000 xsell-api
```

Full stack with an MLflow tracking server:

```bash
docker compose up --build
```

The container healthcheck asserts `model_loaded` in `/health`, not just HTTP 200 —
an image without an artifact reports `degraded` and stays `unhealthy` instead of
pretending to be fine while `/predict` returns 503.

### Tests

```bash
pytest
```

## Project layout

```
src/xsell/
  config.py        typed settings loader (pydantic)
  data.py          csv read + schema validation + train/test split
  features.py      cleaning and the sklearn preprocessing graph
  evaluate.py      metrics + threshold selection
  registry.py      artifact save/load with metadata
  api/main.py      FastAPI app factory
  api/schemas.py   request/response contract
pipelines/
  train.py         training entrypoint (CLI)
configs/base.yml   single source of truth for every knob
```

## Configuration

Everything is driven by `configs/base.yml` — paths, column names, imputation and
scaling strategy, resampling method, estimator and its hyper-parameters, decision
threshold, artifact location and tracking settings. Nothing is hard-coded in the
Python modules, so an experiment is a config change plus a command.

## Dataset

`data/train.csv` and `data/test.csv` are the public *Health Insurance Cross Sell
Prediction* tables (columns: `Gender`, `Age`, `HasDrivingLicense`, `RegionID`,
`Switch`, `VehicleAge`, `PastAccident`, `AnnualPremium`, `SalesChannelID`,
`DaysSinceCreated`, `Result`). Currency values in `AnnualPremium` are stored in
single-byte encoding, hence the `latin-1` reader setting.

## Licence

MIT — see [LICENSE](LICENSE).
