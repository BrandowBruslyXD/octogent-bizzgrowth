#!/bin/bash
# Octogent BizzGrowth — Instalador (macOS)
# Doble click en este archivo desde Finder.
# La primera vez instala todo lo necesario para que la aplicación
# funcione en esta computadora.

set -e

# Posicionarse en la carpeta donde está este script (sin importar
# desde dónde se ejecutó con doble click).
cd "$(dirname "$0")"

clear
cat <<'EOF'

   ╔═════════════════════════════════════════════════════════════╗
   ║                                                             ║
   ║      OCTOGENT BIZZGROWTH — INSTALADOR (PRIMERA VEZ)         ║
   ║                                                             ║
   ╚═════════════════════════════════════════════════════════════╝

   Este proceso instala todo lo necesario en tu computadora.
   Tarda entre 2 y 5 minutos la primera vez. Después de esto, vas
   a poder abrir la aplicación con doble click en "iniciar.command".

   Si te aparece una ventana de seguridad de macOS, dale "Abrir".

EOF

read -p "   Presiona ENTER para comenzar..." _

# 1. Verificar Node.js
echo ""
echo "→ Paso 1 de 4: Verificando Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "   ✗ No tienes Node.js instalado."
  echo ""
  echo "   Por favor, descárgalo desde:"
  echo "   https://nodejs.org/  (elige la versión LTS, botón verde)"
  echo ""
  echo "   Cuando termines de instalar, vuelve a hacer doble click en este archivo."
  echo ""
  read -p "   Presiona ENTER para cerrar..." _
  exit 1
fi
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "   ✗ Tu versión de Node.js es muy vieja (necesitas 22 o superior)."
  echo "   Actualízala desde https://nodejs.org/"
  echo ""
  read -p "   Presiona ENTER para cerrar..." _
  exit 1
fi
echo "   ✓ Node.js $(node --version) detectado."

# 2. Verificar / instalar pnpm
echo ""
echo "→ Paso 2 de 4: Verificando pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "   Instalando pnpm..."
  npm install -g pnpm >/dev/null 2>&1 || {
    echo "   ✗ No se pudo instalar pnpm. Probablemente necesitas permisos."
    echo "   Abre la Terminal y ejecuta:  sudo npm install -g pnpm"
    echo ""
    read -p "   Presiona ENTER para cerrar..." _
    exit 1
  }
fi
echo "   ✓ pnpm $(pnpm --version) listo."

# 3. Verificar Claude Code
echo ""
echo "→ Paso 3 de 4: Verificando Claude Code..."
if ! command -v claude >/dev/null 2>&1; then
  echo ""
  echo "   ⚠ No tienes Claude Code instalado."
  echo ""
  echo "   La aplicación lo necesita para que el consultor responda."
  echo "   Instalación: https://claude.ai/code"
  echo ""
  echo "   Después de instalarlo, abre la Terminal y ejecuta:"
  echo "      claude  "
  echo "   para iniciar sesión con tu cuenta de Claude Pro/Max."
  echo ""
  echo "   ¿Quieres seguir con la instalación de Octogent igual?"
  read -p "   Escribe 'si' y ENTER, o solo ENTER para cancelar: " RESP
  if [ "$RESP" != "si" ]; then
    exit 1
  fi
else
  echo "   ✓ Claude Code detectado."
fi

# 4. Instalar dependencias del proyecto
echo ""
echo "→ Paso 4 de 4: Instalando la aplicación (esto tarda)..."
cd octogent
pnpm install 2>&1 | tail -3
echo ""
echo "   Aprobando módulo nativo node-pty..."
pnpm rebuild node-pty 2>/dev/null || true
echo "   ✓ Aplicación instalada."

cat <<'EOF'


   ╔═════════════════════════════════════════════════════════════╗
   ║                                                             ║
   ║                   ¡INSTALACIÓN COMPLETA!                    ║
   ║                                                             ║
   ║   Para usar la aplicación, haz doble click en:              ║
   ║                                                             ║
   ║         iniciar.command                                     ║
   ║                                                             ║
   ║   (está en la misma carpeta que este instalador)            ║
   ║                                                             ║
   ╚═════════════════════════════════════════════════════════════╝


EOF

read -p "   Presiona ENTER para cerrar esta ventana..." _
