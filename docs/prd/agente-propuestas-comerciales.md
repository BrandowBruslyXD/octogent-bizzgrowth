# PRD — agente-propuestas-comerciales

> **Modo Consultor sobre Octogent existente**: el operador abre Octogent y se encuentra con un chat listo del Octoboss orquestador. El Octoboss conduce 4 fases automáticamente en una sola conversación, escribiendo archivos intermedios en 4 tentáculos consultor (storage visual del progreso). El entregable final es `propuesta.md`.

| Campo | Valor |
|---|---|
| Owner | Dayanne Rojas — Marketing IA, BizzGrowth |
| Estado | Specification v3 — aprobado |
| Fecha | 2026-04-24 |
| Tipo | Bootstrap automático + 1 prompt orquestador + ajustes UI |
| Distribución | Operación interna BizzGrowth (operador corre Octogent localmente) |
| Modelo / suscripción | Claude Code (suscripción del operador, sin API key externa) |
| Costo de runtime | $0 marginal (consumo dentro de la suscripción Claude Code) |

---

## 1. Contexto

BizzGrowth vende automatizaciones IA a PYMES. El descubrimiento manual previo a una propuesta toma 45–60 min y produce un PDF artesanal. Este modo Consultor estandariza el flujo a través de un **único agente orquestador** corriendo en el Octoboss central de Octogent.

**Decisión arquitectónica clave (v3)**: el operador interactúa SOLO con el Octoboss. Los 4 tentáculos consultor son storage visual del progreso (no tienen sesión Claude Code propia). El Octoboss recibe un prompt orquestador monolítico que conduce las 4 fases secuencialmente y transiciona entre ellas sin intervención del operador.

### Evolución del modelo

| Versión | Modelo | Resultado |
|---|---|---|
| v1 (descartado) | CLI npm separado con Next.js + Gemini | Construir todo de cero |
| v2 (descartado) | 4 tentáculos persistentes, operador inserta 4 prompts manualmente | Demasiados clicks; el operador se confunde con qué tentacle abrir |
| **v3 (actual)** | **1 agente Octoboss orquestador, 4 tentáculos como storage, transiciones automáticas** | **Operador solo conversa; resto sucede solo** |

### No-objetivos
- ❌ Construir CLI npm o frontend separado
- ❌ Integrar Gemini, OpenAI ni LLMs externos
- ❌ Capturar leads del prospecto (anónimo)
- ❌ Generar PDF automatizado en v1
- ❌ Modificar `apps/api`, `packages/core`
- ❌ Que el operador inserte prompts manualmente (el orquestador hace todo)
- ❌ Que el operador clickee cada tentacle para "activarlo"

---

## 2. Diseño del orquestador (única fuente de inteligencia)

El prompt `octogent/prompts/octoboss-consultor-orquestador.md` es el único cerebro del flujo. Vive en la biblioteca builtin de Octogent y se inyecta como `promptTemplate` al crear el terminal del Octoboss durante el bootstrap.

### Por qué un solo prompt vs cuatro
- Una sesión Claude Code maneja ~200K tokens de contexto. Las 4 fases combinadas usan <10K — sobra espacio.
- El operador conversa con UN agente, no debe cambiar de tentacle a mitad del flujo.
- Las transiciones entre fases son automáticas: el orquestador anuncia "voy a analizar tu flujo" y pasa a la siguiente fase sin esperar input.
- Eliminamos toda la fricción de "abrí el tentacle X e insertá el prompt Y".

### Estructura del prompt

```
1. Saludo fijo + primera pregunta
2. FASE 1 — Entrevistador (~10 min)
   - Una pregunta a la vez
   - 7 áreas: modelo de negocio, adquisición, ventas, entrega,
     post-venta, herramientas, dolor
   - Al cerrar: escribe interview.json en consultor-entrevistador/
   - Anuncia transición y pasa a FASE 2

3. FASE 2 — Analista
   - Lee interview.json
   - Mapea flujo actual con friction 1-5
   - Escribe current-flow.{json,md} en consultor-analista/
   - Pasa a FASE 3

4. FASE 3 — Arquitecto
   - Solo automatiza pasos friction >= 3
   - Tooling restringido (WhatsApp, n8n, Make, Claude, Supabase, etc)
   - Escribe ideal-flow.{json,md} en consultor-arquitecto/
   - Pasa a FASE 4

5. FASE 4 — Comercial
   - Lee todos los archivos previos
   - Genera propuesta.md en consultor-comercial/ con:
     * 7 secciones fijas
     * Precios en RANGOS COP (setup 2.5-8M, mensual 350K-1.5M)
     * ROI con costo hora 35.000 COP
   - Anuncia path final y ofrece iterar
```

---

## 3. Storage visual: los 4 tentáculos consultor

```
.octogent/tentacles/
  ├── consultor-entrevistador/       ← brilla dorado
  │     ├── CONTEXT.md
  │     └── interview.json           ← escrito por orquestador (fase 1)
  ├── consultor-analista/            ← brilla dorado
  │     ├── CONTEXT.md
  │     ├── current-flow.json        ← escrito por orquestador (fase 2)
  │     └── current-flow.md
  ├── consultor-arquitecto/          ← brilla dorado
  │     ├── CONTEXT.md
  │     ├── ideal-flow.json          ← escrito por orquestador (fase 3)
  │     └── ideal-flow.md
  └── consultor-comercial/           ← brilla dorado
        ├── CONTEXT.md
        └── propuesta.md             ← entregable final (fase 4)
```

Los 4 tentáculos sirven solo como contenedores de archivos generados. NO tienen terminal Claude Code propio. El operador los ve brillar pero NO interactúa con ellos directamente.

---

## 4. Setup inicial (bootstrap automático)

Al primer arranque (`pnpm dev` desde `octogent/`), `useConsultorBootstrap` ejecuta:

1. Espera `isUiStateHydrated === true` y `backendLivenessStatus === "live"`
2. `GET /api/deck/tentacles` — lista tentáculos existentes
3. Crea con `POST /api/deck/tentacles` los 4 consultor que falten
4. `GET /api/terminal-snapshots` — verifica si ya existe terminal del Octoboss
5. Si no existe, `POST /api/terminals` con `{workspaceMode: "shared", tentacleId: "__octoboss__", promptTemplate: "octoboss-consultor-orquestador"}`
6. El callback `onCompleted(octobossTerminalId)` agrega el ID a `canvasOpenTerminalIds` → el panel derecho muestra el chat automáticamente

El bootstrap es **idempotente**: si los tentáculos ya existen y el terminal del Octoboss también, no hace nada.

---

## 5. Cambios de UI (modo consultor)

### Defaults limpios (`usePersistedUiState.ts`)
| Campo | Default ahora |
|---|---|
| `DEFAULT_IS_AGENTS_SIDEBAR_VISIBLE` | `false` |
| `DEFAULT_IS_RUNTIME_STATUS_STRIP_VISIBLE` | `false` |
| `DEFAULT_IS_MONITOR_VISIBLE` | `false` |
| `DEFAULT_IS_BOTTOM_TELEMETRY_VISIBLE` | `false` |

### Glow permanente
`.octopus-node--consultor` con drop-shadow dorado pulsante (CSS) en los 4 tentáculos cuyo nombre empieza con `consultor-`. Respeta `prefers-reduced-motion`.

### Filtro de tentáculos no-consultor
Por defecto el canvas solo muestra Octoboss + 4 consultor. Toggle "Mostrar tentáculos de desarrollo" en Settings (tab 8) reactiva los `agente-*` (sin glow). Estado persistido en `localStorage`.

### Toolbar del Canvas
Cuando `isConsultorMode === true` (que es cuando los tentáculos no-consultor están ocultos), se ocultan los 3 botones de creación: **Terminal**, **Worktree**, **Tentacle**. Se mantienen Fit, Refresh, Hide Idle, Delete All.

### Context menu en tentáculos consultor
Click derecho sobre cualquier `consultor-*` en modo consultor: NO abre el menú. Esto evita que el operador dispare accidentalmente "Create new agent" o "Spawn Swarm" sobre los tentáculos consultor (que son storage, no agentes activos).

---

## 6. Flujo del operador (4 pasos)

```
1. Operador abre Octogent: cd octogent && pnpm dev
2. Bootstrap auto-crea los 4 tentáculos + terminal Octoboss (silencioso)
3. Panel derecho ya muestra el chat del Octoboss saludando con:
     "¡Hola! Soy tu consultor IA de BizzGrowth. ¿Empezamos? Para
      arrancar concreto: ¿qué producto o servicio vendes hoy?"
4. Operador conversa (vía pantalla compartida o WhatsApp con prospecto).
   Octoboss conduce las 4 fases automáticamente. Al final dice:
     "Listo. Tu propuesta quedó en
      .octogent/tentacles/consultor-comercial/propuesta.md"
5. Operador copia propuesta.md a Notion / Google Docs y exporta a PDF
```

---

## 7. Métricas de éxito (90 días)

| Métrica | Meta | Cómo medir |
|---|---|---|
| Sesiones que llegan a `propuesta.md` | ≥ 80% | Conteo de archivos `propuesta.md` con timestamp del periodo |
| Tiempo promedio operador (apertura → propuesta) | ≤ 25 min | Cronometrado por el operador |
| Conversión propuesta → llamada agendada | ≥ 30% | Tracking en Calendly |
| Iteraciones promedio sobre `propuesta.md` | ≤ 2 | Operador anota |

---

## 8. Criterios de aceptación

### CA-1 — Bootstrap idempotente
- [ ] Al primer `pnpm dev` aparecen 4 tentáculos `consultor-*` brillando + chat Octoboss en panel derecho
- [ ] Si reinicio Octogent, no se duplican tentáculos ni terminales
- [ ] Si borro `consultor-entrevistador` y reinicio, se recrea (tentáculo + carpeta)
- [ ] Si borro el terminal del Octoboss y reinicio, se recrea con el orquestador inyectado
- [ ] El bootstrap no se ejecuta dos veces por StrictMode

### CA-2 — Glow visual y filtro
- [ ] Los 4 `consultor-*` tienen drop-shadow dorado pulsante
- [ ] Tentáculos no-consultor están ocultos por defecto; toggle en Settings los muestra sin glow
- [ ] Animación respeta `prefers-reduced-motion`

### CA-3 — Toolbar y context menu
- [ ] En modo consultor, el toolbar del Canvas NO muestra Terminal / Worktree / Tentacle
- [ ] Click izquierdo en `consultor-*` abre el panel del tentacle (puede ver archivos generados)
- [ ] Click derecho en `consultor-*` en modo consultor NO abre menú
- [ ] Click derecho en Octoboss SÍ abre menú (acciones del orquestador)
- [ ] Activar el toggle "Mostrar tentáculos de desarrollo" reactiva toolbar y context menu

### CA-4 — Auto-arranque del chat
- [ ] Al primer arranque el panel derecho del Canvas ya muestra el terminal del Octoboss
- [ ] El terminal del Octoboss recibió el orquestador como `promptTemplate`
- [ ] El Octoboss saluda con "¡Hola! Soy tu consultor IA de BizzGrowth..."
- [ ] El operador puede escribir su respuesta sin clicks adicionales

### CA-5 — Orquestación automática (calidad de output)
- [ ] El Octoboss hace UNA pregunta por turno en fase 1
- [ ] Ante respuesta vaga, repregunta antes de avanzar
- [ ] Al cerrar fase 1 escribe `interview.json` y anuncia transición sin esperar input
- [ ] Lo mismo para fases 2, 3 y 4
- [ ] `propuesta.md` final tiene 7 secciones fijas, precios en rango, CTA con email/WhatsApp

### CA-6 — Cero impacto en backend
- [ ] `pnpm lint` sin warnings nuevos
- [ ] `pnpm test` 100% pasa
- [ ] `pnpm build` compila sin errores
- [ ] `git status` solo muestra cambios en `apps/web/`, `prompts/` y este PRD

---

## 9. Verificación end-to-end

```bash
# 1. Reset limpio
cd <carpeta-del-proyecto>/octogent
rm -rf .octogent/tentacles/consultor-*
# (opcional, en DevTools del navegador) localStorage.clear()

# 2. Arrancar
pnpm dev
```

**3. Verificación visual** (navegador):
- 4 tentáculos consultor brillando + Octoboss central
- Panel derecho con terminal del Octoboss conversando
- Saludo "¡Hola! Soy tu consultor IA de BizzGrowth..."
- Toolbar Canvas SIN Terminal/Worktree/Tentacle
- Click derecho en `consultor-entrevistador`: NO abre menú
- Click derecho en Octoboss: SÍ abre menú

**4. Smoke test conversacional** (~25 min, caso ficticio "clínica dental con 3 sedes"):
- Responder al Octoboss
- Verificar que pregunta una a la vez, profundiza ante respuestas vagas
- Tras 8-12 turnos, verificar transición automática a fase 2 (sin clicks)
- Verificar archivos generados:
  ```bash
  cat .octogent/tentacles/consultor-entrevistador/interview.json | jq .
  cat .octogent/tentacles/consultor-comercial/propuesta.md
  ```

**5. Lint + build + test**:
```bash
pnpm lint && pnpm --filter @octogent/web run build && pnpm --filter @octogent/web run test
```

---

## 10. Archivos creados / modificados

### Nuevos
- `apps/web/src/app/hooks/useConsultorBootstrap.ts` — bootstrap idempotente
- `apps/web/src/app/hooks/useShowNonConsultorTentacles.ts` — toggle filtro
- `apps/web/src/styles/console-canvas-consultor.css` — glow CSS
- `octogent/prompts/octoboss-consultor-orquestador.md` — el cerebro

### Modificados
- `apps/web/src/App.tsx` — wirea hooks + props
- `apps/web/src/styles.css` — importa CSS nuevo
- `apps/web/src/app/hooks/usePersistedUiState.ts` — defaults limpios
- `apps/web/src/components/CanvasPrimaryView.tsx` — filtro nodos + isConsultorMode
- `apps/web/src/components/canvas/OctopusNode.tsx` — className glow
- `apps/web/src/components/SettingsPrimaryView.tsx` — toggle no-consultor
- 3 tests (`app-shell-navigation`, `app-github-runtime`, `app-workspace-setup`, `app-monitor-runtime`) — mocks de UI state explícitos para preservar cobertura

### Eliminados
- `octogent/prompts/consultor-fase-1-entrevistador.md` (legacy v2)
- `octogent/prompts/consultor-fase-2-analista.md` (legacy v2)
- `octogent/prompts/consultor-fase-3-arquitecto.md` (legacy v2)
- `octogent/prompts/consultor-fase-4-comercial.md` (legacy v2)

### NO tocados
- `apps/api/**`, `packages/core/**`, `package.json`, lockfiles

---

## 11. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Bootstrap crea 2 terminales Octoboss en StrictMode | Alta | Medio | `useRef` guard + check vía `GET /api/terminal-snapshots` |
| Operador borra accidentalmente el terminal del Octoboss | Media | Bajo | Reload reactiva el bootstrap → se crea de nuevo (idempotente) |
| El orquestador es muy largo y satura contexto | Baja | Medio | Las 4 fases combinadas pesan ~5KB; Claude soporta 200K |
| El orquestador pide al operador insertar prompts (regresión a v2) | Baja | Alto | Prompt explícitamente prohíbe esto y dice "vos orquestás todo" |
| Click derecho en consultor sin menú confunde al operador | Baja | Bajo | El operador no tiene razón para clickear ahí — el chat está en el Octoboss |
| Falta confirmación visual de la fase actual | Baja | Bajo | Cada anuncio de transición ("voy a analizar tu flujo...") es la confirmación textual; archivos en cada tentacle son la confirmación material |

---

## 12. Trabajo fuera de alcance (futuro v4)

- Export PDF directo con branding BizzGrowth (sin Notion intermedia)
- Modo "express" — variante del orquestador con 5 preguntas core
- Plantilla de propuesta por vertical
- Dashboard de propuestas generadas
- Botón "Nueva sesión" — limpia archivos de los 4 tentáculos para empezar otro cliente
- Visualización de "fase activa" en el canvas (animación que cambia el glow del tentacle vivo)
- Integración con HubSpot (sincroniza leads cuando una propuesta avanza)
