# Repository Guidelines

## Code Style First
- Preserve existing patterns before inventing new ones. Read nearby code and match the established module shape, naming, and data flow unless there is a clear reason to change direction.
- Start with tests. For bug fixes, reproduce first. For new features, add the test that defines the behavior before expanding the implementation.
- Implement incrementally. Prefer small, working steps over broad rewrites. Keep the tree passing as you go.
- Think in systems. Extract shared behavior into reusable components, hooks, utilities, or domain functions instead of cloning slightly different versions.
- Keep modules focused. Large React containers should orchestrate, not hold every constant, parser, and JSX block. Keep pure logic in `src/app/*`, UI in `src/components/*`, and CSS split into focused files under `src/styles/*`.
- Comments explain why, not what. Add comments only for constraints, tradeoffs, or non-obvious reasoning.
- Design defensively. Validate assumptions, handle edge cases, and treat security boundaries as part of the implementation, not a follow-up.

## Project Structure
- Monorepo: `apps/*` and `packages/*` via `pnpm-workspace.yaml`.
- Runtime: Node.js 22+, TypeScript, `pnpm`.
- Core package: `packages/core`
  - Framework-agnostic domain types, application logic, and ports.
  - Must stay free of React, HTTP, PTY, and filesystem orchestration concerns.
- API app: `apps/api`
  - Node HTTP/WebSocket server, PTY session runtime, worktree lifecycle, transcript persistence, monitor service.
- Web app: `apps/web`
  - Vite + React operator UI, modular CSS, UI orchestration over API/runtime contracts.
- Runtime state: `.octogent/`
  - `state/tentacles.json`
  - `state/transcripts/*.jsonl`
  - `worktrees/<tentacleId>`

## Documentation Map
- Start at `README.md` for the product overview and command surface.
- Docs index: `docs/index.md`
- Core concepts:
  - `docs/concepts/mental-model.md`
  - `docs/concepts/tentacles.md`
  - `docs/concepts/runtime-and-api.md`
- Workflow guides:
  - `docs/guides/working-with-todos.md`
  - `docs/guides/orchestrating-child-agents.md`
  - `docs/guides/inter-agent-messaging.md`
- References:
  - `docs/reference/cli.md`
  - `docs/reference/api.md`
  - `docs/reference/filesystem-layout.md`
  - `docs/reference/troubleshooting.md`
- Read only the docs relevant to the surface you are touching. Do not do a full docs sweep unless the task is documentation maintenance.

## Architecture Boundaries
- `packages/core` defines domain contracts and pure application logic. Both apps may depend on it; it must not depend on app code.
- `apps/api` owns infrastructure concerns: PTYs, WebSockets, filesystem persistence, process execution, and git worktree operations.
- `apps/web` owns presentation and client-side interaction state. Do not move server-only behavior into the web app to avoid adding hidden backend logic to the UI.
- If behavior is reusable across apps, move it into `packages/core` only when it can remain framework-agnostic.
- Keep orchestration thin. Entry points such as API server/bootstrap files and top-level React containers should wire dependencies, not accumulate business logic.

## Workflow
- Read only the guides and code relevant to the surface you are changing. Do not sweep the whole repo before starting.
- Prefer small, isolated edits over broad cleanup unless the task explicitly asks for refactoring.
- Keep docs in sync with behavior changes when user-facing workflows, commands, persistence layout, or architecture assumptions change.
- Preserve the product vocabulary already documented in `CLAUDE.md`: agents, sessions, worktrees, logs, pipelines, tentacles, and terminal columns.

## Verification
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Format: `pnpm format`
- For narrow changes, run the most direct test or package-scoped test first, then widen verification as needed.
- For changes that affect shared contracts, persistence, or cross-app behavior, run the relevant package tests and the root build before landing.

## Scoped Guides
- `apps/api/AGENTS.md` expands server/runtime/worktree rules.
- `apps/web/AGENTS.md` expands UI/component/style rules.
- `packages/core/AGENTS.md` expands domain and ports-and-adapters rules.

<!-- Ruflo configuration (auto-generated) -->
# Claude Code Configuration - RuFlo V3

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
- Keep files under 500 lines
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
