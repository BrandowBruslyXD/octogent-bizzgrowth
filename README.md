# Octogent BizzGrowth — Tu Consultor de Automatización con IA

Esta aplicación entrevista a un prospecto, analiza su negocio, diseña una automatización
y entrega una propuesta comercial lista para enviar al cliente. Todo a través de un
chat conversacional con un agente de IA.

> **Pensada para usar en tu propia computadora.** No se instala en internet, no
> sube datos a la nube. Tu información y la de tus prospectos se queda en tu equipo.

---

## ¿Qué necesitas antes de empezar?

Sólo dos cosas (una vez en la vida):

### 1. Node.js

Es el motor que hace funcionar la aplicación. Si no lo tienes:

1. Visita **<https://nodejs.org/>**
2. Haz click en el botón verde grande que dice **"LTS"** (Long Term Support).
3. Cuando descargue, abre el archivo y sigue el instalador paso a paso (siguiente, siguiente, instalar).

### 2. Claude Code

Es el cerebro de la aplicación (la IA que conversa con el prospecto). Necesitas
una suscripción de **Claude Pro** o **Claude Max** (la versión paga de claude.ai).

1. Visita **<https://claude.ai/code>**
2. Sigue los pasos de instalación que aparecen en la página.
3. Cuando termines, abre el programa **Terminal** (en Mac está en
   Aplicaciones → Utilidades, o presiona `Cmd + Espacio` y escribe "Terminal").
4. En la Terminal, escribe `claude` y presiona Enter.
5. Sigue las instrucciones para iniciar sesión con tu cuenta de Claude.

---

## Cómo instalar la aplicación (una sola vez)

### Si estás en Mac

1. Descarga este proyecto (botón verde "Code" en GitHub → "Download ZIP", o
   pídele al equipo el archivo).
2. Descomprime el archivo en una carpeta. Por ejemplo, **"Documentos"** o el
   **Escritorio**. Te queda una carpeta llamada `agente-octogen`.
3. Abre esa carpeta.
4. **Doble click en el archivo `instalar.command`**.
5. macOS te puede mostrar una advertencia de seguridad. Si pasa eso:
   - Click derecho sobre `instalar.command` → "Abrir".
   - En la ventana que aparece, click "Abrir" otra vez.
6. Se abre una ventana de Terminal y empieza a instalar. Tarda entre 2 y 5
   minutos. Cuando dice **"¡INSTALACIÓN COMPLETA!"** ya está.

### Si estás en Linux

1. Abre la Terminal en la carpeta del proyecto.
2. Ejecuta: `bash instalar.sh`
3. Espera que termine (2-5 minutos).

---

## Cómo usar la aplicación todos los días

### En Mac

1. Abre la carpeta `agente-octogen`.
2. **Doble click en `iniciar.command`**.
3. Se abre una ventana negra (Terminal). Después de unos 10 segundos, **se
   abre tu navegador automáticamente** con la aplicación lista.
4. Para cerrar la aplicación al terminar, simplemente **cierra la ventana
   negra** (la Terminal).

### En Linux

1. En la Terminal, ejecuta: `bash iniciar.sh`
2. Se abre el navegador automáticamente. Para cerrar, presiona `Ctrl + C`
   en la terminal.

---

## Tu primera propuesta comercial

Cuando se abre el navegador, vas a ver:

- **A la izquierda**: un diagrama con un pulpo amarillo en el centro (el "Octoboss",
  tu consultor) y 4 pulpos pequeños alrededor (las 4 fases del proceso).
- **A la derecha**: un chat. Es donde conversas con el consultor.

### Pasos básicos

1. La primera vez, aparece una guía con 5 pasos. Léela y dale "Entendido — empezar".
2. **Ve al chat** (panel derecho) y responde las preguntas del consultor en lenguaje
   natural, como si hablaras con una persona.
3. **Mira los pulpos** mientras conversas:
   - **Apagado/gris**: fase aún no iniciada.
   - **Brillando con halo amarillo**: la fase que está corriendo en este momento.
   - **Color sólido**: fase ya completada.
4. El consultor pasa por 4 fases automáticamente:
   1. **Entrevistador**: te pregunta sobre el prospecto.
   2. **Analista**: arma el mapa del flujo actual del negocio.
   3. **Arquitecto**: diseña el flujo ideal automatizado.
   4. **Comercial**: escribe la propuesta comercial.
5. Cuando termina, **arriba a la derecha** aparece un botón **"Descargar
   propuesta (.doc)"**. Hazle click y se descarga un documento listo para
   abrir en Word o Google Docs.

### Para entrevistar a otro prospecto

Click en el botón **"Nuevo prospecto"** (arriba a la derecha). Te pide
confirmación. Click en "Sí, reiniciar" y la aplicación se reinicia con todo
limpio para empezar otra entrevista.

---

## Solución a problemas comunes

### El consultor no responde nada

Probablemente Claude Code no está logueado en esta computadora.
1. Abre la Terminal.
2. Escribe `claude` y presiona Enter.
3. Sigue las instrucciones para iniciar sesión.
4. Cuando termines, vuelve a hacer doble click en `iniciar.command`.

### El navegador no se abrió solo

Abre tu navegador (Chrome, Safari, Firefox) y entra manualmente a:
**<http://localhost:5173>**

### Cerré sin querer la ventana negra

No pasa nada. Vuelve a hacer doble click en `iniciar.command` y la aplicación
arranca otra vez. Si tenías una conversación a medias, va a continuar donde
la dejaste.

### Quiero borrar absolutamente todo y empezar como nueva instalación

1. Cierra la aplicación (cierra la ventana negra).
2. Dentro de la carpeta `agente-octogen/octogent/` borra la carpeta oculta
   llamada `.octogent`. (En Mac, presiona `Cmd + Shift + .` para ver
   archivos ocultos en Finder).
3. Vuelve a hacer doble click en `iniciar.command`.

---

## Soporte

Si algo no funciona, contacta al equipo de desarrollo con:
- Una captura de pantalla del error.
- El sistema operativo (Mac / Linux) y la versión.

El proyecto técnico vive en `octogent/` (subcarpeta). Documentación interna
para desarrolladores en `octogent/README.md` y `octogent/docs/`.

---

## Créditos

Esta aplicación es un fork especializado de [**Octogent**](https://github.com/hesamsheikh/octogent),
un orquestador open-source para correr múltiples sesiones de Claude Code en
paralelo, creado por [Hesam Sheikh](https://github.com/hesamsheikh).

El "modo Consultor BizzGrowth" agrega:
- Un orquestador conversacional con 4 fases pre-configuradas (entrevistador,
  analista, arquitecto, comercial).
- UI estilo Claude Desktop con un único chat persistente.
- Indicadores visuales por fase (idle / done / current con animación).
- Descarga directa de la propuesta como documento Word.
- Scripts de un click para usuarios sin conocimiento técnico.

Licencia: MIT (ver `LICENSE`).

