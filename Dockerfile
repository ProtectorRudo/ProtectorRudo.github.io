FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY bundle.br.b64 /tmp/bundle.br.b64
RUN pip install --no-cache-dir brotli==1.1.0 && python -c "import base64,brotli,io,tarfile; b=base64.b64decode(open('/tmp/bundle.br.b64').read()); t=tarfile.open(fileobj=io.BytesIO(brotli.decompress(b))); t.extractall('/app',filter='data')"
RUN pip install --no-cache-dir -r requirements.txt
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/tmp/viral-lab
EXPOSE 10000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers"]
