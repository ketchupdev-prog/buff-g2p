# SmartPay AI (FastAPI / LangGraph). Build context: apps/smartpay-ai/
#   docker build -t smartpay-ai -f Dockerfile .

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY smartpay_ai ./smartpay_ai

RUN mkdir -p /app/data/lancedb /app/data && chown -R nobody:nogroup /app/data

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV LANCEDB_PATH=/app/data/lancedb
ENV DUCKDB_PATH=/app/data/analytics.duckdb

EXPOSE 8000

USER nobody

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)"

CMD ["sh", "-c", "exec uvicorn smartpay_ai.main:app --host 0.0.0.0 --port ${PORT}"]
