# FoodSnap — Agent Entrypoint

Before writing any code in this repo:

1. Read [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) **in full**. It is the single source of truth for what FoodSnap is and how every piece must be built.
2. For any UI work, [`docs/DESIGN.md`](docs/DESIGN.md) is the visual source of truth — tokens, components, per-screen specs (dark-only).
3. Open [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — the live task tracker. Pick the next available task in the current phase and follow the tracking protocol at the top of that file: claim (`[~]`) → implement → run the task's **Verify** line → tick (`[x]`) → update the dashboard → append a Work Log row → commit.

A task is done only when its Verify line actually passed. Phases complete only when their Definition of Done checklist is fully checked.

## Working rules (from the brief §10 — binding)

1. Work strictly in phase order; within a phase, get a walking skeleton before polishing.
2. Verify current stable versions of RN, ML Kit, Fastify, and tooling before pinning anything — record them in the Verified Versions table in `IMPLEMENTATION_PLAN.md`.
3. Conventional-ish commit messages scoped per package (`mobile:`, `gateway:`, `classifier:`).
4. Never invent nutrition data sources requiring API keys; the bundled JSON is the MVP source.
5. If a step needs a human (keystore, repo secrets, running on a physical device, `terraform apply`), stop and print exact instructions instead of faking it.
6. Keep every explanation in code/docs truthful to what's implemented. This is a recent, deliberately-scoped demonstration project — never present it as a long-running product or imply fake history.
