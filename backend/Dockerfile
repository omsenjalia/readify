FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway (and most PaaS) inject PORT; default 8000 for local docker runs.
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
