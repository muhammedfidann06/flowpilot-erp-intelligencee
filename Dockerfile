# A dependency-free read-only fixture service. Run behind a hardened reverse proxy for shared environments.
FROM python:3.13-slim
WORKDIR /app
COPY backend /app/backend
COPY dist/data.json /app/dist/data.json
USER 65534:65534
EXPOSE 8000
CMD ["python", "backend/server.py", "--host", "0.0.0.0", "--port", "8000"]
