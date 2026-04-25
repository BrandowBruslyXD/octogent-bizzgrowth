# Code Review — Modo Consultor + apps/web

Fecha: 2026-04-24
Scope: `apps/web/` (frontend). `apps/api` y `packages/core` quedan fuera por la regla de CLAUDE.md "no tocar backend salvo solicitud explícita".

Metodología: Hive-mind con 4 reviewers en paralelo (Canvas/graph, Shell/Deck, Runtime, Tests/Consultor). Los hallazgos del apartado "Deuda detectada — hive-mind review" abajo provienen de esa pasada.

## Resumen ejecutivo

Se ejecutó limpieza de legacy y setup de E2E con Playwright. El criterio fue:

- Eliminar duplicación real (constantes y funciones copiadas en varios archivos).
- Reducir superficie de `export` innecesaria (símbolos sólo usados dentro del propio módulo).
- Agregar suite Playwright con 2 specs iniciales (smoke + invariantes del modo Consultor).
- **No** tocar `apps/api` ni `packages/core`.
- **No** refactorizar componentes grandes sin PRD previo — existe `docs/prd/agente-propuestas-comerciales.md` que norma el modo Consultor.

## Cambios aplicados

### 1. Deduplicación de helpers visuales (refactor)

`OCTOPUS_COLORS`, `ANIMATIONS`, `EXPRESSIONS`, `ACCESSORIES`, `hashString`, `seededRandom` estaban duplicados en:

- `apps/web/src/components/deck/octopusVisuals.ts` (source of truth)
- `apps/web/src/app/hooks/useCanvasGraphData.ts`
- `apps/web/src/components/canvas/OctopusNode.tsx`
- `apps/web/src/components/canvas/CanvasTentaclePanel.tsx` (con nombres locales `hashStr`, `seededRng`)

**Acción**: centralizado en `octopusVisuals.ts`; los otros 3 archivos ahora importan. Consecuencias:
- Un solo lugar para mantener la paleta y el RNG seeded.
- `CanvasTentaclePanel.tsx` ahora usa `hashString`/`seededRandom` (nombres canónicos), consistente con el resto.

### 2. Des-exportación de símbolos sólo usados localmente

Knip marcaba como "unused exports" símbolos que sí se usan pero sólo dentro de su propio archivo. La fix correcta no es borrarlos sino quitar `export` — reduce la superficie pública del módulo.

Archivos tocados en `apps/web/src/components/deck/`:
- `ActionCards.tsx`: `AGENT_PROVIDER_OPTIONS`, `ActionCardsProps`
- `AddTentacleForm.tsx`: `EXPRESSION_OPTIONS`, `ACCESSORY_OPTIONS`, `HAIR_COLORS`, `AddTentacleFormProps`
- `TentaclePod.tsx`: `STATUS_LABELS`, `TodoList`, `TentaclePodProps`
- `DeckBottomActions.tsx`: `DeckBottomActionsProps`

Otros:
- `apps/web/src/app/hooks/useConsultorActiveTools.ts`: `ConsultorToolState`
- `apps/web/src/components/DeckPrimaryView.tsx`: se eliminó `export type { OctopusAppearancePayload }` (no tenía consumidores externos).

### 3. Playwright E2E

Añadido:
- `apps/web/playwright.config.ts` (reuse del dev server existente, chromium única plataforma).
- `apps/web/tests-e2e/smoke.spec.ts` — shell carga, React monta, título correcto.
- `apps/web/tests-e2e/consultor-mode.spec.ts` — chat del Octoboss visible, divider del panel derecho bloqueado.
- Script `test:e2e` en `apps/web/package.json`.
- `@playwright/test` como devDependency en `apps/web`.

Para ejecutar:
```bash
cd apps/web
pnpm exec playwright install chromium  # primera vez
pnpm test:e2e
```

## Deuda detectada (no aplicada — requiere decisión previa)

### Bundling y performance
- `dist/assets/index-*.js` = 507 kB gzip 150 kB. Excede el límite de warning de Vite. Vale la pena `manualChunks` o `React.lazy` en vistas poco usadas (Monitor, GitHub, SetupWizard).
- `xterm-*.js` = 283 kB separado — OK, se carga sólo al abrir terminal.

### Archivos grandes (>500 líneas — viola CLAUDE.md)
Auditar (no se modificó aún):
- `CanvasPrimaryView.tsx`, `App.tsx`, `AddTentacleForm.tsx`, `TentaclePod.tsx`, `CanvasTentaclePanel.tsx` — varios rozan o superan el límite. Candidatos a extracción de hooks/subcomponentes, pero cada split afecta tests de snapshot.

### STATUS_LABELS duplicado
`TentaclePod.tsx` y `CanvasTentaclePanel.tsx` definen `STATUS_LABELS` con valores idénticos y tipos ligeramente distintos (`Record<status, string>` vs `Record<string, string>`). Candidato a mover a un módulo compartido — bajo riesgo pero requiere decidir dónde (¿`deck/statusLabels.ts` o `packages/core`?).

### Duplicación residual en `OctopusNode.tsx`
`OctopusNode.tsx` ahora importa de `octopusVisuals.ts`, pero su tipo local `OctopusVisuals` sigue definido. Podría reusar el del módulo compartido, aunque los shapes difieren (el de canvas no tiene `color`). Bajo valor, alto ruido — dejar.

### Dependencias flageadas por knip
- `node-pty`, `ws` en `package.json` raíz: aparecen como "unused" pero son deps del runtime de `apps/api`. **No tocar.**
- `apps/web/vite.api.bundle.config.mts`: referenciado en `scripts.build` de `package.json` raíz. Falso positivo de knip. **No tocar.**

### apps/api (fuera de scope)
Knip reporta 9 exports y 4 tipos sin uso en `projectPersistence.ts`, `runtimeMetadata.ts`, `setupState.ts`, etc. Probablemente limpieza segura pero requiere autorización explícita.

## Verificación final

```
pnpm format            → Formatted 521 files in 58ms. No fixes applied.
pnpm --filter @octogent/web run build → ✓ built in 1.12s
pnpm --filter @octogent/web run test  → Test Files 21 passed (21)  Tests 81 passed (81)
knip                   → 19 → 9 unused exports (todos en apps/api, fuera de scope)
```

Lint del repo raíz (`pnpm lint`) tiene 128 errores **pre-existentes** en `.claude/helpers/*.js` (scripts de tooling, no código de producto). Ninguno afecta `apps/` o `packages/`.

## Deuda detectada — hive-mind review (4 reviewers en paralelo)

Esta sección consolida los hallazgos de los 4 code reviewers paralelos. **Ninguno fue aplicado** — requieren decisión del equipo porque varios tocan áreas que el CLAUDE.md del proyecto marca como sensibles (bootstrap del Octoboss, defaults de `usePersistedUiState`, contratos de API).

### CRÍTICO (bugs o violaciones de contrato)

1. ~~**`useCanvasGraphData.ts` construye el grafo en el render path**~~ **FIXED**: jitter ahora usa `seededRandom(hashString(sessionNodeId))` (determinístico, inmune a Strict Mode), y la actualización de `prevNodesRef` se movió a un `useEffect`.
2. ~~**`useConsultorBootstrap.ts:218` — `onCompleted` en deps del efecto**~~ **FIXED**: patrón `onCompletedRef` — la referencia se actualiza en cada render, pero el efecto solo depende de `enabled`. Nunca aborta un bootstrap en vuelo por cambio de ref del callback.
3. ~~**Fetches sin `AbortController`**~~ **FIXED**: `DeckPrimaryView.tsx:fetchTentacles`, `useTentacleGitLifecycle.ts:fetchTentacleGitStatus` y `fetchTentaclePullRequest` aceptan signal opcional; los `useEffect` correspondientes crean un `AbortController` y lo cancelan en cleanup. `App.tsx` — las 5 URLs hardcodeadas (`/api/terminals`×3, `/api/deck/tentacles`×1, `/swarm`×1) migradas a builders (`buildTerminalsUrl`, `buildDeckTentaclesUrl`, `buildDeckTentacleSwarmUrl` — este último recién agregado a `runtimeEndpoints.ts`). Esos handlers son mutaciones por click del usuario, no efectos de montaje, por lo que no requieren abort.
4. ~~**URLs hardcodeadas en `useTerminalMutations.ts`**~~ **FIXED**: migradas a `buildTerminalUrl()` / `buildTerminalsUrl()`; nuevo helper `buildTerminalUrl(terminalId)` en `runtimeEndpoints.ts`.
5. ~~**Mock de `/api/ui-state` duplicado en 5 test files**~~ **FIXED**: helper `defaultUiStateResponse(overrides)` agregado a `apps/web/tests/test-utils/appTestHarness.ts` y usado en los 5 archivos. El tipo `PersistedUiState` importa en un solo lugar; cualquier cambio futuro del shape es detectado por el compilador en todos los call sites.
6. ~~**`ConsultorArtifactPanel` sin tests unitarios**~~ **OBSOLETO**: el componente fue eliminado. Reemplazado por:
   - `apps/web/src/components/consultor/artifactDownload.ts` — utilidades puras (~80 líneas) con `downloadPropuesta(format)` como API pública.
   - `apps/web/src/components/consultor/ConsultorPropuestaButton.tsx` — botón flotante (~50 líneas) que aparece en el panel derecho del Canvas cuando `consultor-comercial` publicó propuesta.md (estado del polling existente en `useConsultorActiveTools`).
   - CSS reescrito en `console-canvas-consultor-artifact.css` (de 360 a 60 líneas).
   - Eliminada la rama `if (node.tentacleId.startsWith("consultor-"))` de `CanvasPrimaryView.tsx` (~13 líneas).
   - Neto: **−240 líneas**, descarga `.doc` ahora funciona en modo Consultor puro (antes solo modo dev).
7. ~~**E2E con `test.skip` condicional**~~ **FIXED**: `tests-e2e/consultor-mode.spec.ts` ahora valida el divider bloqueado con `expect(...).toBeVisible()` (assertion duro, timeout 30s).

### IMPORTANTE (calidad, performance, mantenibilidad)

8. **Violaciones del límite de 500 líneas** — refactor mayor aplicado:
   - ~~`EmptyOctopus.tsx` (715)~~ → **105** (sprites movidos a `octopusSprites.ts`).
   - ~~`UsageHeatmap.tsx` (702)~~ → **487** (builders puros movidos a `apps/web/src/app/usageHeatmapBuilders.ts` + 23 tests nuevos).
   - ~~`CanvasPrimaryView.tsx` (1632)~~ → **1153** (extraídos `useCanvasPanelHydration` hook, `buildSessionEdgeGroups` función pura testeada, `CanvasContextMenu` y `CanvasToolbar` componentes). Invariantes del modo Consultor preservadas.
   - ~~`App.tsx` (679)~~ → **591** (13 callbacks movidas a `useCanvasActions` hook).
   - ~~`DeckPrimaryView.tsx` (620)~~ → **468** ✅ (fetch+state a `useDeckTentacles` hook).
   - ~~`useTentacleGitLifecycle.ts` (540)~~ → **451** ✅ (parsers a `gitLifecycleParsers.ts` + 18 tests).
   - Pendientes: `usePersistedUiState.ts` (538), `Terminal.tsx` (524). `octopusSprites.ts` (565) y `CanvasPrimaryView.tsx` (1153 sigue grande pero es la vista monolítica del modo Consultor con muchas invariantes UX, refactor adicional requeriría PRD).
9. **Duplicación byte-a-byte** entre `OctopusNode.tsx:119-173` y `CanvasPrimaryView.tsx:155-203` (`renderEdgeActivityDots`, `isEdgeActivityVisible`). Extraer a `apps/web/src/components/canvas/edgeActivity.tsx`.
10. **`CanvasTentaclePanel.tsx:109-199` — cinco handlers `handleTodo*` con patrón idéntico** (fetch + catch silencioso + refresh). Extraer a `callTodoEndpoint(url, method, body)`.
11. **`useForceSimulation.ts:237-275` — reheat innecesario**: cualquier cambio en `params` dispara `alpha(0.8).restart()`, aunque sólo cambie `collisionPadding`. El grafo "explota" visualmente.
12. **Cast ciego en `useConversationsRuntime.ts:265`**: `payload.hits as ConversationSearchHit[]` sin normalizador. Contrasta con `normalizeConversationSessionSummary` que sí valida campo por campo.
13. **Race condition en `useConversationsRuntime.ts:163`**: `deleteSession` captura `selectedSessionId` por closure. Si el usuario cambia de sesión con un DELETE en vuelo, se usa el valor viejo → salto de navegación inesperado. Usar ref.
14. **`App.tsx` — callbacks async inline sin `useCallback`** (líneas 525-527, 558-643): `onLaunchWorkspaceSetupPlanner`, `onCreateTentacle`, `onSpawnSwarm`, `onOctobossAction`, `onTentacleAction`, `onRefresh`. Cada render de `App` genera nuevas referencias que propagan re-renders al router de vistas.
15. **`hasSidebarActionPanel` recalculado en cada render** (`App.tsx:371-376`) con `.find()` sobre `terminals`. Envolver en `useMemo`.
16. **`TentaclePod.tsx:106-109` — `availableSkillNames`/`skillNames` con `map+Set+spread+sort` en cada render**. Candidato a `useMemo`.
17. **Tests inspeccionan selectores CSS internos** (`app-github-runtime.test.tsx:100, 127-134`): `.console-status-sparkline polyline`, `.github-overview-graph-point`. Testing de implementación, no de comportamiento. Usar `getByRole`/`aria-label`.
18. **`app-monitor-runtime.test.tsx:16-289` — un solo test de 289 líneas** que valida 6 comportamientos. Si falla el primer paso, los 5 restantes no se ejecutan. Fragmentar con `beforeEach`.

### NICE-TO-HAVE

19. `CanvasTentaclePanel.tsx:45` — `stored?.hairColor ?? undefined` es no-op (el `?.` ya retorna `undefined`).
20. `CanvasPrimaryView.tsx:53-54` — `workspaceMode?: string` sin `| undefined` explícito, inconsistente con el patrón del resto bajo `exactOptionalPropertyTypes: true`.
21. `useCanvasGraphData.ts:382-384` — `Array.find` O(n) donde hay `currentNodesById.get()` disponible.
22. `useConsultorActiveTools.ts:39` — guard `if (controller.signal)` siempre truthy. Eliminar.
23. `TentaclePod.tsx:43` — `TodoList` usa `item.text` como `key` (colisiona si dos items tienen el mismo texto).
24. `DeckPrimaryView.tsx:387-390` — `ClearAll` hace deletes secuenciales en serie. `Promise.all` lo paraleliza.
25. `Terminal.tsx:158` — reconnect timer fijo 900ms → 66 intentos/min si el backend está caído. Backoff exponencial con cap a 30s.
26. `useConversationsRuntime.ts:318` — `loadSelectedSession` sin `AbortController`; usa un ref de número de request pero el fetch sigue consumiendo ancho de banda.
27. `useCanvasGraphData.ts:48` — `normalizeDeckTentacleSummary` debería vivir en `conversationNormalizers.ts` o en un `deckNormalizers.ts`.
28. `useConsultorActiveTools` sin tests — hook core del modo Consultor con efecto visual directo (glow vs grayscale).
29. `EmptyOctopus.tsx` — 91% del archivo son matrices de sprite data. Extraer a `octopusSprites.ts` deja el componente en <80 líneas.

## Recomendación

Orden sugerido de ataque (sin autorización aún):
1. **Hotfixes críticos #1-#4** (bugs reales) — bootstrap, graph build en render, abort signals, URLs hardcodeadas. Cada uno es un PR pequeño con test.
2. **#5 helper de test** — elimina 5× duplicación y reduce fragilidad documentada en CLAUDE.md.
3. **E2E consultor real** (#7 + spec del workflow bootstrap → 4 tools → propuesta.md). Correr `playwright install chromium` primero.
4. **Split de archivos >500 líneas** (#8) — candidatos quirúrgicos: `EmptyOctopus` (extracción de sprites), `UsageHeatmap` (extracción de builders puros), `CanvasPrimaryView` (hook `useCanvasPanelHydration` + componente `CanvasContextMenu`). Cada split con tests en verde antes/después.
5. **Performance** (#11, #14, #15, #16) — memoización + dejar de reheat en cambios menores.
6. **Limpieza de `apps/api`** (9 exports huérfanos de knip) — una vez autorizado.
