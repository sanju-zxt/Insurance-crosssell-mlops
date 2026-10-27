ifeq ($(OS),Windows_NT)
	PY := .venv/Scripts/python.exe
	PIP := .venv/Scripts/pip.exe
else
	PY := .venv/bin/python
	PIP := .venv/bin/pip
endif

.PHONY: setup train train-mlflow serve test mlflow docker clean

setup:
	python -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt

train:
	$(PY) pipelines/train.py

train-mlflow:
	$(PY) pipelines/train.py --mlflow

serve:
	$(PY) -m uvicorn xsell.api.main:app --app-dir src --reload

mlflow:
	$(PY) -m mlflow ui --port 5000 --backend-store-uri sqlite:///mlflow.db

test:
	$(PY) -m pytest

docker:
	docker build -t xsell-api .
	docker run --rm -p 8000:8000 xsell-api

clean:
	$(PY) -c "import pathlib,shutil;[shutil.rmtree(p,ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]"
	$(PY) -c "import shutil;shutil.rmtree('.pytest_cache',ignore_errors=True)"
