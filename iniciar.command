#!/bin/bash
# Octogent BizzGrowth — Iniciador (macOS)
# Doble click en este archivo desde Finder.
# Arranca la aplicación y abre el navegador automáticamente.

set -e
cd "$(dirname "$0")"

clear
cat <<'EOF'

   ╔═════════════════════════════════════════════════════════════╗
   ║                                                             ║
   ║              OCTOGENT BIZZGROWTH — ARRANCANDO               ║
   ║                                                             ║
   ╚═════════════════════════════════════════════════════════════╝

   La aplicación está iniciando. Tarda unos 10 segundos.

   Cuando termine, se va a abrir tu navegador automáticamente
   en http://localhost:5173

   Para CERRAR la aplicación: cierra esta ventana de Terminal o
   presiona Ctrl + C dos veces.

EOF

# Verificación rápida — si no se hizo install, redirigir
if [ ! -d "octogent/node_modules" ]; then
  echo ""
  echo "   ✗ La aplicación no está instalada todavía."
  echo "   Primero haz doble click en:  instalar.command"
  echo ""
  read -p "   Presiona ENTER para cerrar..." _
  exit 1
fi

cd octogent

# Abrir el navegador después de unos segundos en background
(
  sleep 8
  open "http://localhost:5173" 2>/dev/null || true
) &

# Arrancar el server (ocupa esta terminal hasta que el usuario la cierre)
pnpm dev
