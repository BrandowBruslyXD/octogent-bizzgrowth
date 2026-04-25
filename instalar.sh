#!/bin/bash
# Octogent BizzGrowth — Instalador (Linux)
# Ejecutar desde la terminal:  bash instalar.sh

set -e
cd "$(dirname "$0")"

cat <<'EOF'

  OCTOGENT BIZZGROWTH — INSTALADOR

  Este proceso instala todo lo necesario en tu computadora.
  Tarda entre 2 y 5 minutos la primera vez.

EOF

if ! command -v node >/dev/null 2>&1; then
  echo "✗ No tienes Node.js instalado. Descárgalo desde https://nodejs.org/"
  exit 1
fi
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "✗ Necesitas Node.js 22 o superior."
  exit 1
fi
echo "✓ Node.js $(node --version)"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Instalando pnpm..."
  npm install -g pnpm
fi
echo "✓ pnpm $(pnpm --version)"

if ! command -v claude >/dev/null 2>&1; then
  echo "⚠ Claude Code no está instalado. Visitá https://claude.ai/code"
fi

cd octogent
pnpm install
pnpm rebuild node-pty 2>/dev/null || true

cat <<'EOF'

  ¡INSTALACIÓN COMPLETA!

  Para usar la aplicación, ejecuta:
     bash iniciar.sh

EOF
