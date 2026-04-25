# Claude Code Configuration - RuFlo V3

## Estado de code review (2026-04-24)

Review consolidado en `octogent/docs/review/consultor-mode.md` (hive-mind 4 reviewers). Aplicados:

- Dedup de `OCTOPUS_COLORS`/`ANIMATIONS`/`EXPRESSIONS`/`ACCESSORIES`/`hashString`/`seededRandom` → single source of truth en `octogent/apps/web/src/components/deck/octopusVisuals.ts`.
- 9 exports innecesarios en `apps/web` des-exportados.
- Setup Playwright E2E en `octogent/apps/web/tests-e2e/` (smoke + consultor-mode.spec.ts).
- URLs hardcodeadas en `useTerminalMutations.ts` migradas a `buildTerminalUrl()` / `buildTerminalsUrl()`. Se agregó `buildTerminalUrl(terminalId)` a `runtimeEndpoints.ts`.
- Limpiezas menores: `stored?.hairColor ?? undefined` → `stored?.hairColor`; guard redundante `if (controller.signal)` removido en `useConsultorActiveTools.ts` pasando signal directo.

Críticos resueltos (acumulado):

- **#1** `useCanvasGraphData.ts`: jitter determinístico + `prevNodesRef` en `useEffect`.
- **#2** `useConsultorBootstrap.ts`: patrón `onCompletedRef`, solo `enabled` en deps del efecto.
- **#3** AbortController en `DeckPrimaryView.tsx:fetchTentacles` y `useTentacleGitLifecycle.ts` (status + pull request). Las 5 URLs hardcodeadas en `App.tsx` migradas a builders (nuevo `buildDeckTentacleSwarmUrl`); sus handlers son mutaciones por click, no efectos de mount.
- **#4** URLs hardcodeadas en `useTerminalMutations.ts`: migradas a `buildTerminalUrl()` / `buildTerminalsUrl()`.
- **#7** E2E consultor-mode: `test.skip` condicional reemplazado por assertion duro.

Pendientes (ver `octogent/docs/review/consultor-mode.md` para detalle):

- **#6** ~~`ConsultorArtifactPanel`~~ ELIMINADO. Reemplazado por:
  - `apps/web/src/components/consultor/artifactDownload.ts` (utilidades puras, API pública: `downloadPropuesta(format)`).
  - `apps/web/src/components/consultor/ConsultorPropuestaButton.tsx` (botón flotante en el panel derecho del Canvas, visible solo cuando `consultor-comercial` publicó `propuesta.md`).
  - CSS reescrito en `console-canvas-consultor-artifact.css` (360 → 60 líneas).
  - Neto −240 líneas. La descarga `.doc` ahora funciona en modo Consultor puro.
- Violaciones de límite de 500 líneas (estado actual tras refactor): `CanvasPrimaryView.tsx` **1153** (-479 vs original 1632), `App.tsx` **591** (-88), `usePersistedUiState.ts` 538, `Terminal.tsx` 524, `octopusSprites.ts` 565 (datos puros — flexibilizar regla). `DeckPrimaryView.tsx` ahora **468** ✅, `useTentacleGitLifecycle.ts` ahora **451** ✅, `GitHubPrimaryView.tsx` 494 ✅, `UsageHeatmap.tsx` 487 ✅.

Fix acumulado:

- **#5** Mock `/api/ui-state`: helper `defaultUiStateResponse(overrides)` agregado en `apps/web/tests/test-utils/appTestHarness.ts`, adoptado en los 5 test files con 12 call sites.
- **EmptyOctopus.tsx** 715 → 105 líneas. Sprites + canvas helpers extraídos a `apps/web/src/components/octopusSprites.ts`.
- **UsageHeatmap.tsx** 702 → 487 líneas. Funciones puras (`buildBars`, `buildYTicks`, `buildColorMap`, `buildTrendPath`, `buildHeatmapGrid`, formatters) extraídas a `apps/web/src/app/usageHeatmapBuilders.ts`. +23 tests nuevos en `tests/usageHeatmapBuilders.test.tsx`.
- **Code-split** del bundle: `MonitorPrimaryView`, `GitHubPrimaryView`, `CodeIntelPrimaryView`, `ConversationsPrimaryView`, `PromptsPrimaryView`, `SettingsPrimaryView` ahora cargan vía `React.lazy + Suspense` desde `PrimaryViewRouter.tsx`. Chunk principal: 504.99 → 459.97 kB raw / **149.50 → 138.08 kB gzip**. Vistas primarias del flujo Consultor (Canvas, Deck, Activity) siguen sync.
- **`ConsultorArtifactPanel`** eliminado (322 líneas) → reemplazo: `artifactDownload.ts` + `ConsultorPropuestaButton.tsx` (~130 líneas total). La descarga `.doc` ahora funciona en modo Consultor puro (antes solo modo dev). CSS reescrito de 360 → 60 líneas.

- **CanvasPrimaryView split** (1632 → 1147 líneas, -485). Extraídos:
  - `apps/web/src/app/canvasEdgeGroups.ts` (función pura `buildSessionEdgeGroups`, 61 líneas, +7 tests)
  - `apps/web/src/app/hooks/useCanvasPanelHydration.ts` (hook de hidratación, 211 líneas)
  - `apps/web/src/components/canvas/CanvasContextMenu.tsx` (277 líneas)
  - `apps/web/src/components/canvas/CanvasToolbar.tsx` (123 líneas)
  Invariantes del modo Consultor preservados (`handleNodeClick` early-return, divider locked, polling de tools).
- **`apps/api` cleanup**: 19 exports y 4 tipos huérfanos quitados (`projectPersistence.ts`, `runtimeMetadata.ts`, `setupState.ts`, `terminalRuntime/constants.ts`, `terminalRuntime/registry.ts`, `startupPrerequisites.ts`); 2 constantes nunca usadas borradas.
- **Worktree huérfano** `octogent/.octogent/worktrees/terminal-4` removido limpio con `git worktree remove` + `git branch -D` (4 MB liberados, registry de git limpio).

- **App.tsx split** 679 → 591 (-88 líneas). 13 callbacks de canvas movidas a `apps/web/src/app/hooks/useCanvasActions.ts` (205 líneas). Cada callback envuelta en `useCallback` con deps correctas — fixea hallazgo I2 del review (re-renders en cascada).
- **DeckPrimaryView.tsx split** 620 → 468 (-152). Fetch + state de tentáculos a `apps/web/src/app/hooks/useDeckTentacles.ts` (231 líneas).
- **useTentacleGitLifecycle.ts split** 540 → 451 (-89). Parsers puros a `apps/web/src/app/gitLifecycleParsers.ts` (95 líneas) + 18 tests nuevos.
- **Lint cleanup** 139 errores → **0**. `.claude/helpers/**` ignorado en `biome.json` (scripts de tooling externo); auto-fix seguro en `apps/web`; `biome-ignore` justificados en falsos positivos de `useExhaustiveDependencies` y `useSemanticElements`.

Total acumulado en esta jornada: **~1700 líneas** removidas/reorganizadas en `apps/web/src/`, **+48 tests** (81 → 129), **24 test files** verde, **lint exit 0** (era 139 errores), bundle gzip 149.5 → 139.2 kB. Bugs latentes resueltos: Strict Mode en grafo, race del bootstrap del Octoboss, abort signals en 3 hooks. Helper de tests anti-fragilidad, descarga de propuesta accesible en flujo final, `apps/api` con superficie pública mínima, repo sin worktrees huérfanos. Modo Consultor: invariantes UX preservadas en cada extracción.

## Contexto del proyecto agente-octogen (LEER PRIMERO)

Este repo es **un fork local de Octogent** (orquestador open-source que corre Claude Code en múltiples sesiones — "tentáculos"). El código real vive en el subdirectorio `octogent/` (monorepo pnpm con `apps/web` Vite+React, `apps/api` Node, `packages/core`).

El uso final es **modo Consultor de BizzGrowth**: un orquestador que entrevista a un prospecto y genera una propuesta comercial automatizada. La usuaria principal es **Dayanne Rojas** (Marketing IA, BizzGrowth).

### Reglas específicas del proyecto (no romper)

- **NUNCA construir un producto nuevo de cero.** Octogent ya existe y funciona. Cualquier feature nueva debe sentarse sobre la UI/runtime existente. Si te aparece la idea de "crear un CLI npm separado" o "armar un Next.js paralelo", esa idea está mal — primero investiga qué ya hay en `octogent/`.
- **NUNCA crear archivos manualmente en `.octogent/tentacles/<id>/`.** Esos directorios los crea el endpoint `POST /api/deck/tentacles` o el CLI `bin/octogent tentacle create`. Crear a mano deja huérfanos que confunden al sistema. Si necesitás un tentacle nuevo, llamá al endpoint.
- **NUNCA tocar `apps/api`, `packages/core`, `package.json` ni lockfiles** salvo que el usuario lo pida explícitamente. La regla por defecto es "modo Consultor solo agrega frontend + prompts". Si se requiere tocar el backend, presentá el cambio en plan mode primero.
- **El "campo de texto" del usuario YA EXISTE** — es el terminal xterm.js que se renderiza en el panel derecho del Canvas. No proponer construir un input nuevo.
- **Octogent corre Claude Code con la SUSCRIPCIÓN del usuario**, no con API key. No proponer integrar Gemini/OpenAI/etc.

### Trampas específicas de la integración con Octogent

- **`useCanvasGraphData` solo hace fetch al MONTAR.** No hay polling automático. Si creás tentáculos vía API después del primer mount, la UI NO los ve hasta refresh manual. Solución: pasá un `externalDeckRefreshTrigger` (counter) que el Canvas observa y dispara `refreshDeckTentacles`. Hay un patrón ya implementado en `App.tsx` post-bootstrap del consultor.
- **Idempotencia de terminales**: `POST /api/terminals` con el mismo `tentacleId` crea uno nuevo cada vez (no reusa). Antes de crear, llamá `GET /api/terminal-snapshots` y filtrá por `tentacleId` Y por `initialPrompt.includes("<firma única del prompt>")`. Filtrar solo por `tentacleId` es laxo y deja terminales viejos sin el prompt esperado.
- **`promptTemplate` vs `initialPrompt`**: el primero resuelve un `.md` builtin de `octogent/prompts/` con interpolación de `{{variables}}`. El segundo es texto crudo. Para inyectar un prompt builtin al crear un terminal, usá `promptTemplate`.
- **El `cwd` del PTY NO es `tentacleContextPath`**. Si `workspaceMode === "worktree"` el cwd es `.octogent/worktrees/<id>/`; si es `shared` el cwd es el root del proyecto. Para acceder al folder del tentacle desde un prompt, usá `{{tentacleContextPath}}` (path absoluto interpolado).
- **TypeScript estricto con `exactOptionalPropertyTypes: true`** en el repo. NO podés pasar `signal: undefined`; usá asignación condicional:
  ```ts
  const requestInit: RequestInit = { method: "GET", headers: {...} };
  if (signal) requestInit.signal = signal;
  ```
- **Persistencia de UI state**: cambios al tipo `PersistedUiState` en `packages/core` están prohibidos por defecto. Para preferencias nuevas del frontend, usá `localStorage` directo (patrón de `useShowNonConsultorTentacles.ts`).
- **Cambiar defaults en `usePersistedUiState.ts` rompe tests** que asumen los valores antiguos. Tras cambiar un default, ajustá los mocks de `/api/ui-state` en `tests/app-shell-navigation.test.tsx`, `app-github-runtime.test.tsx`, `app-workspace-setup.test.tsx`, `app-monitor-runtime.test.tsx` para que retornen el flag explícito que el test asume.

### Verificación obligatoria antes de declarar "listo"

```bash
cd <carpeta-del-proyecto>/octogent
pnpm format && pnpm lint && pnpm --filter @octogent/web run build && pnpm --filter @octogent/web run test
```

Los 4 deben pasar. Si los tests rompen por cambios de defaults o de bootstrap, **arreglá los mocks**, no reviertas los cambios.

### Estado del Modo Consultor (qué ya está implementado)

- 4 tentáculos consultor pre-creados al primer arranque (entrevistador / analista / arquitecto / comercial)
- 1 prompt orquestador único en `octogent/prompts/octoboss-consultor-orquestador.md`
- Bootstrap automático que crea tentáculos + terminal del Octoboss con orquestador
- Toggle "Mostrar tentáculos de desarrollo" en Settings (oculto por default)
- Toolbar Canvas oculta los botones Terminal/Worktree/Tentacle en modo consultor
- Click derecho en `consultor-*` no abre menú (en modo consultor)

PRD vigente: `docs/prd/agente-propuestas-comerciales.md` (versión v3 — un orquestador, no 4 prompts manuales).

### Lógica de UX en modo Consultor (CRÍTICO — no romper)

**El panel derecho es exclusivamente el chat del Octoboss** (terminal xterm). No es resizable, no se puede cerrar, no comparte espacio con otros paneles. Se abre automáticamente al terminar el bootstrap (`handleConsultorBootstrapCompleted` en `App.tsx` agrega `octobossTerminalId` a `canvasOpenTerminalIds`).

**Los tentáculos consultor-* son TOOLS, no contenedores de UI.** En modo Consultor, click izquierdo sobre un nodo `consultor-*` o sobre el Octoboss **NO abre ningún panel** — solo selecciona visualmente. El handler `handleNodeClick` en `CanvasPrimaryView.tsx` retorna early para `tentacle`/`octoboss` cuando `isConsultorMode === true`.

**Estado idle/active de cada tool**: el hook `useConsultorActiveTools` (en `apps/web/src/app/hooks/`) hace polling cada 4s al endpoint `/api/deck/tentacles/:id/files/:filename` para los 4 archivos de output (`interview.json`, `current-flow.md`, `ideal-flow.md`, `propuesta.md`). Si el archivo existe → la tool está `"active"` y el tentáculo se enciende con su color propio (inyectado vía CSS custom property `--consultor-glow-inner` desde `OctopusNode`). Si no → `"idle"`, grayscale + opacity 0.62.

**Divider del panel derecho bloqueado**: en modo Consultor, `handleDividerPointerDown` retorna early y el divider recibe la clase `canvas-panel-divider--locked` (pointer-events: none). El chat es estático.

**Trade-off conocido sobre la descarga de propuesta**: el componente `ConsultorArtifactPanel` (que renderiza propuesta.md y ofrece descarga `.md`/`.doc`) sigue existiendo y se dispara al click en consultor-* cuando `isConsultorMode === false` (modo dev con toggle ON). En modo Consultor puro no hay UI de descarga — si se vuelve a pedir, hay que sumar un botón flotante o entry en el header del chat sin reactivar el panel sobre el chat.

### Trampas adicionales del modo Consultor

- **El polling de tools actives respeta abort signals**, pero el endpoint `/api/deck/tentacles/:id/files/:filename` solo responde a `GET` (no `HEAD`). No cambies el método del fetch.
- **Cuando un nodo SVG ya tiene `style={{ cursor: "grab" }}`**, no agregues otro `style=` separado: TS17001 (duplicate JSX attribute). Mergeá en un objeto `mergedStyle` con spread.
- **CSS custom properties tipadas en React**: `style={{ ["--consultor-glow-inner" as string]: color } as CSSProperties}` — el `as string` para la key y el cast final son obligatorios bajo `exactOptionalPropertyTypes`.
- **Auto-apertura del chat**: el panel derecho con el chat del Octoboss se renderiza solo cuando `openTerminals.size > 0` (`{hasPanels && ...}` en `CanvasPrimaryView.tsx`). En modo Consultor, un `useEffect` busca el primer terminal con `tentacleId === "__octoboss__"` en `columns` y lo agrega a `openTerminals` automáticamente. **No remover ese efecto** — sin él, click en Octoboss tampoco abre nada porque `openTerminals` permanece vacío. El click handler en modo Consultor también dispara el mismo abrir como fallback.

### Estados visuales de las tools (consultor-* tentáculos) — `useConsultorActiveTools`

Tres estados. **No volver al modelo binario `active/idle`** — no permite distinguir fase actual de fases ya completadas y por eso fue rediseñado.

| Estado | Cuándo | CSS / visual |
|--------|--------|--------------|
| `idle` | El archivo de output no existe | grayscale 0.95 + opacity 0.32 — silueta apagada |
| `done` | Archivo existe, sin cambios en los últimos 30s | color sólido + drop-shadow ligero, opacity 0.92 |
| `current` | Archivo cambió en los últimos 30s **y** es el más reciente de las 4 | color + glow fuerte + animación pulse |

Reglas críticas:

- **Solo UNA tool puede estar `current` a la vez** — la del `lastChangedAt` más reciente dentro de la ventana de 30s. La `consultor-mode.spec.ts` valida esta invariante.
- El estado `current` es **el indicador visual de "fase ejecutando ahora"**. Sin esta señal el operador no sabe qué pasa (los archivos persisten entre flujos y todo queda permanentemente "done").
- **Detección de cambios sin `Last-Modified` header**: el endpoint del API no expone `Last-Modified`. La detección es client-side: el hook guarda fingerprint (`size` + primeros 200 chars del contenido) en un ref. Cuando cambia, `lastChangedAt = Date.now()`. Robusto para reescrituras del orquestador.
- **El botón "Descargar propuesta" del panel derecho** aparece tanto en `done` como en `current` para `consultor-comercial` (no solo en `current`). Ver `ConsultorPropuestaButton` consumer en `CanvasPrimaryView.tsx`.
- **No cambiar `CURRENT_WINDOW_MS = 30_000` sin actualizar el E2E `consultor-mode.spec.ts`** — el test de "solo una current" depende de la ventana.
- **Rotura por archivos de runs anteriores**: `.octogent/tentacles/<id>/<file>` persiste entre arranques. Al levantar dev server con archivos ya presentes, el primer poll los detecta como cambio (no había snapshot previo) y todos pasan a `current` por unos segundos antes de degradar a `done`. Es comportamiento aceptable; no fix necesario.

### Click en Octoboss / consultor-* en modo Consultor

- Click izquierdo sobre **consultor-*** → solo `setSelectedNodeId` (highlight). NO abre panel propio.
- Click izquierdo sobre **__octoboss__** → busca terminal con ese tentacleId en `columns`, lo agrega a `openTerminals` (idempotente). Es la forma de re-abrir el chat si el operador lo cerró.
- El `useEffect` de auto-apertura cubre el caso del bootstrap inicial; el click handler cubre el caso de re-apertura manual.

### Reset del flujo (botón "Nuevo prospecto")

- Componente: `apps/web/src/components/consultor/ConsultorPropuestaButton.tsx` (botón flotante arriba a la derecha del chat).
- Acción interna: `resetConsultorOutputs()` en `artifactDownload.ts` borra los 4 archivos de output via DELETE a `/api/deck/tentacles/<id>/files/<file>` (endpoint extendido en `apps/api/src/createApiServer/deckRoutes.ts` para soportar DELETE además de GET; `deleteDeckVaultFile` en `readDeckTentacles.ts`). El parent (`CanvasPrimaryView`) además mata el terminal del Octoboss y dispara `window.location.reload()` — el orquestador tiene memoria del prospecto anterior y debe arrancar fresco con un nuevo terminal.
- **No optimizar el reload**: la combinación archivos + matar terminal + reload garantiza que el bootstrap recree todo desde cero. Los workarounds (chat command, hot-reset del orchestrator) son frágiles porque el modelo retiene contexto.

### Onboarding del primer uso

- Componente: `apps/web/src/components/consultor/ConsultorOnboarding.tsx`.
- Visible cuando `consultorActiveTools` está vacío o todos en `idle` (primera ejecución, sin archivos de output) y no fue dismissed antes (localStorage key `octogent.consultor.onboardingDismissedAt`).
- Para forzar reaparición durante desarrollo: borrar la key con `localStorage.removeItem("octogent.consultor.onboardingDismissedAt")` desde devtools.

### Instalación en máquina limpia (regalar a usuario final)

Verificado en `/tmp` con copia limpia de `dist/` + `bin/` + `package.json`:

1. `pnpm install --prod` → instala `node-pty` y `ws`.
2. `pnpm approve-builds node-pty && pnpm rebuild node-pty` → necesario porque node-pty tiene build hooks bloqueados por defecto en pnpm.
3. `bin/octogent` arranca el server. UI se sirve en mismo puerto que API (8787 por default).
4. Al primer arranque sin `.octogent/`, el server muestra "workspace is not initialized yet; use the in-app setup flow" — Dayanne entra a http://127.0.0.1:8787, ve el setup wizard, y después aparece el modo Consultor con onboarding.

Documentación de usuario final: `octogent/docs/install-dayanne.md`.

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines (excepción: archivos de **assets/sprite data** como `apps/web/src/components/octopusSprites.ts` — son matrices de píxeles + drawing helpers, no lógica de negocio. La regla de 500 líneas asume archivos con flujo de control, no data estática)
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

## Dev-Standard

This project uses the Dev-Standard Kit (SPARC + Ruflo + Hive Mind).

### Development Flow
Every feature follows SPARC:
1. **Specification** - Create PRD at docs/prd/<feature>.md
2. **Pseudocode** - Design algorithms
3. **Architecture** - Define interfaces at docs/architecture/<feature>.md
4. **Refinement** - Implement with TDD (Red-Green-Refactor)
5. **Completion** - Review at docs/review/<feature>.md

### Quick Commands
- `/dev-standard:init` - Initialize project
- `/dev-standard:status` - Check gates status
- `npx ruflo sparc pipeline "feature"` - Full SPARC pipeline
- `npx ruflo memory search "query"` - Search team knowledge

### Quality Gates
Configured in .claude/dev-standard.json. Gates: warn (advisory) or block (enforced).
Completion gate is always BLOCK - no merge without review.
