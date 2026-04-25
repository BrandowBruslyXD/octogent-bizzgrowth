# Cómo instalar Octogent BizzGrowth en una computadora nueva

Esta guía es para regalarle Octogent a una persona que va a usarlo localmente. Ella necesita:

## 1. Pre-requisitos (una sola vez)

- **macOS o Linux**. Windows no está soportado.
- **Node.js 22 o superior**. Verificar con `node --version`. Si no está, instalarlo desde [nodejs.org](https://nodejs.org/).
- **pnpm 10 o superior**. Instalar con: `npm install -g pnpm`
- **Claude Code instalado y logueado** con su suscripción Claude Pro/Max. Probar con `claude --version`. Si no está: instrucciones en [claude.ai/code](https://claude.ai/code).

## 2. Instalación

Desde la terminal:

```bash
# 1. Instalar Octogent
npm install -g @octogent/cli   # o el paquete que se publique
# (alternativa: clonar el repo y correr `pnpm install && pnpm build`)

# 2. Aprobar el build nativo de node-pty (solo la primera vez)
pnpm approve-builds node-pty
pnpm rebuild node-pty
```

## 3. Arrancar la app

Desde la carpeta donde quiere trabajar (puede ser una nueva, ej. `~/PropuestasBizzGrowth`):

```bash
cd ~/PropuestasBizzGrowth
octogent
```

La consola va a mostrar:

```
Octogent is running
  API:     http://127.0.0.1:8787
  UI:      http://127.0.0.1:8787
```

Abrir el browser en **http://127.0.0.1:8787**.

## 4. Primer uso

1. La app va a mostrar un **onboarding** con 5 pasos. Léelo y dale "Entendido — empezar".
2. Ir al chat de la derecha (es el Octoboss).
3. Responder sus preguntas en lenguaje natural — el orquestador maneja 4 fases (entrevista, análisis, diseño ideal, propuesta) sin que tengas que cambiar de pantalla.
4. Cuando termine, va a aparecer un botón **"Descargar propuesta (.doc)"** arriba a la derecha.
5. Para entrevistar a otro prospecto: botón **"Nuevo prospecto"** → confirmar. Borra el flujo anterior y empezás fresco.

## Visual del canvas

- **Octoboss central (amarillo)**: el chat principal.
- **4 pulpos alrededor**: las 4 fases.
  - **Apagado/gris**: fase no empezada.
  - **Brillando con halo amarillo**: fase corriendo en este momento.
  - **Color sólido**: fase completada.

## Si algo falla

- **El chat no responde**: revisar que Claude Code esté logueado (`claude --version` y `claude` en otra terminal).
- **No aparece la propuesta para descargar**: completar primero las 4 fases del entrevistador. Mirá los pulpos — solo cuando comercial está active aparece el botón.
- **Quiero borrar todo y empezar de cero**: cerrar Octogent (Ctrl+C en la terminal), borrar la carpeta `.octogent` del proyecto, volver a arrancar.
