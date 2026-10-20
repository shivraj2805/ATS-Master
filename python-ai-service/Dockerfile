# ============================================================
# Stage 1: Build / install Python dependencies
# ============================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build tools for native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install dependencies into a prefix dir
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================================
# Stage 2: Production image
# ============================================================
FROM python:3.11-slim AS production

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh -m appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Set Python environment flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

# Copy application source
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 --timeout 180 --access-logfile - --error-logfile - app:app"]
