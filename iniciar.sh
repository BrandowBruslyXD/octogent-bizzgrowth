#!/bin/bash
# Octogent BizzGrowth — Iniciador (Linux)
# Ejecutar desde la terminal:  bash iniciar.sh

set -e
cd "$(dirname "$0")"

if [ ! -d "octogent/node_modules" ]; then
  echo "✗ La aplicación no está instalada. Ejecuta primero: bash instalar.sh"
  exit 1
fi

cd octogent

# Abrir el navegador después de unos segundos
(
  sleep 8
  xdg-open "http://localhost:5173" 2>/dev/null || true
) &

pnpm dev
