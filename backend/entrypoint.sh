#!/bin/sh
set -e

echo "============================================"
echo "  Bootstrap: preparando banco de dados..."
echo "============================================"
python bootstrap.py

echo ""
echo "============================================"
echo "  Iniciando API FastAPI..."
echo "============================================"
exec uvicorn app:app --host 0.0.0.0 --port 8000
