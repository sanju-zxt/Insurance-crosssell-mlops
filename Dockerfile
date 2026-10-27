FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY configs/ ./configs/
COPY models/ ./models/

RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# /health answers 200 even when the model is missing (status="degraded"), so the
# probe must assert model_loaded, otherwise an image without an artifact would
# still be reported "healthy" while /predict returns 503.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import json,sys,urllib.request; body=urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=4).read().decode(); sys.exit(0 if json.loads(body).get('model_loaded') is True else 1)"]

CMD ["uvicorn", "xsell.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/src"]
