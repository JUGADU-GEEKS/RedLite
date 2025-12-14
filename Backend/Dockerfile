# Backend/Dockerfile
FROM python:3.11-slim

# Prevents Python from writing .pyc files and enables logs to stream
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

# Install system deps required for opencv, ffmpeg, font rendering etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    wget \
    ca-certificates \
    git \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libjpeg-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (better layer caching)
COPY requirements.txt /app/requirements.txt

# Upgrade pip and install Python deps
RUN pip install --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r /app/requirements.txt

# Copy app code
COPY . /app

# Make a directory for models (mount here at runtime)
RUN mkdir -p /app/models

# Expose the port your app listens on
EXPOSE 8000

# Healthcheck (calls your /health endpoint; adjust path if different)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:8000/health || exit 1

# Start command: change main:app if your entrypoint differs
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]