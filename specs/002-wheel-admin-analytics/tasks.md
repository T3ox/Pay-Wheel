# Tasks: colori ruota e dashboard amministrativa

**Input**: Design documents from `/specs/002-wheel-admin-analytics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the specification quality gates and implementation plan.

## Phase 1: Setup

- [X] T001 Verify repository ignore rules and existing workspace scripts in `.gitignore`, `eslint.config.js`, and root `package.json`
- [X] T002 Add admin analytics backfill command and script entry in `functions/package.json` and `functions/src/scripts/backfill-admin-analytics.ts`

## Phase 2: Foundational

- [X] T003 [P] Add admin analytics domain models, schemas, merge, and basis-point calculations in `packages/domain/src/admin-analytics.ts` and `packages/domain/src/index.ts`
- [X] T004 [P] Add failing domain tests for aggregation, protected participants, all-time merge, corrections, and null denominators in `packages/domain/src/admin-analytics.test.ts`
- [X] T005 Add Firestore analytics references and idempotent transaction helpers in `functions/src/repositories/firestore.ts` and `functions/src/repositories/admin-analytics.ts`

## Phase 3: User Story 1 — Distinguere tutti gli spicchi della ruota (P1) 🎯 MVP

**Goal**: ogni spicchio conserva un colore opaco valido; la protezione è comunicata senza sostituire il fill.

**Independent Test**: ruote con 1, 8, 9 e 25 partecipanti, inclusi protetti, non contengono fill `url(...)` e restano identificabili tramite testo e indicatore grafico.

- [X] T006 [P] [US1] Extend palette tests for 1, 8, 9, and 25 participants, fallback, adjacency, and label contrast in `apps/web/src/features/outings/wheelPalette.test.ts`
- [X] T007 [P] [US1] Add protected-segment DOM assertions in `apps/web/src/features/outings/WheelFlow.test.tsx`
- [X] T008 [US1] Implement deterministic 25-participant colors and readable label selection in `apps/web/src/features/outings/wheelPalette.ts`
- [X] T009 [US1] Remove `protectedPattern`, preserve participant fills, and render a non-fill protection overlay in `apps/web/src/features/outings/Wheel.tsx`
- [X] T010 [US1] Add protected overlay and dynamic label styles in `apps/web/src/styles/app.css`

## Phase 4: User Story 2 — Consultare la dashboard amministrativa privata (P1)

**Goal**: l'admin consulta spese, estrazioni, partecipazioni eleggibili e percentuali per settimana o all-time.

**Independent Test**: un admin apre la pagina, cambia periodo e ottiene totali/percentuali coerenti con fixture note, incluse correzioni e dati incompleti.

- [X] T011 [P] [US2] Add callable and aggregation tests for weekly/all-time data, replay, and correction deltas in `functions/test/admin-analytics.test.ts`
- [X] T012 [US2] Apply analytics atomically during manual and automatic settlement and corrections in `functions/src/callable/confirm-payment.ts` and `functions/src/callable/payment-lifecycle.ts`
- [X] T013 [US2] Implement `getAdminAnalytics` callable and export in `functions/src/callable/admin-analytics.ts` and `functions/src/index.ts`
- [X] T014 [US2] Implement idempotent historical rebuild in `functions/src/scripts/backfill-admin-analytics.ts`
- [X] T015 [P] [US2] Add admin dashboard component tests for success, empty, null metric, sorting, and period changes in `apps/web/src/features/admin/AdminDashboardPage.test.tsx`
- [X] T016 [US2] Add local/remote analytics loader and test-mode aggregation in `apps/web/src/features/admin/adminAnalytics.ts`
- [X] T017 [US2] Implement responsive sortable admin dashboard in `apps/web/src/features/admin/AdminDashboardPage.tsx` and `apps/web/src/styles/app.css`

## Phase 5: User Story 3 — Impedire l'accesso ai dati amministrativi (P1)

**Goal**: anonimi e membri non admin non vedono la route, la voce menu o il payload degli aggregati.

**Independent Test**: menu, URL diretto, callable e accesso Firestore negano dati a un membro; una revoca invalida la richiesta successiva.

- [X] T018 [P] [US3] Add Security Rules tests denying direct `adminAnalytics` reads/writes to every client in `functions/test/rules/firestore.rules.test.ts`
- [X] T019 [US3] Deny client access to `adminAnalytics` in `firebase/firestore.rules`
- [X] T020 [US3] Propagate authoritative membership access through session types and adapters in `apps/web/src/features/entry/session.ts`, `apps/web/src/features/entry/SessionProvider.tsx`, `apps/web/src/features/entry/adapters/firebaseSessionAdapter.ts`, and `apps/web/src/features/entry/adapters/localTestSessionAdapter.ts`
- [X] T021 [US3] Add guarded admin route and conditional menu item in `apps/web/src/features/admin/AdminRouteGate.tsx`, `apps/web/src/app/App.tsx`, and `apps/web/src/app/MinimalShell.tsx`
- [X] T022 [US3] Clear private dashboard state and redirect on revoked access in `apps/web/src/features/admin/AdminDashboardPage.tsx`

## Phase 6: Polish and validation

- [X] T023 [P] Update implementation validation guidance and task evidence in `specs/002-wheel-admin-analytics/quickstart.md`
- [X] T024 Run lint, typecheck, unit tests, production build, and applicable rules tests from root `package.json`
- [X] T025 Verify all specification requirements and mark completed tasks in `specs/002-wheel-admin-analytics/tasks.md`

## Dependencies & Execution Order

- Phase 1 precedes all implementation.
- T003 and T004 precede T005, T011–T017, and T020.
- User Story 1 depends only on setup and can be validated independently.
- User Story 2 depends on foundational analytics; server work precedes the web loader/page.
- User Story 3 depends on the callable and dashboard route existing; Rules tests can be prepared independently.
- Final validation follows all stories.

## Parallel Opportunities

- T003 and T004 affect separate domain files.
- T006 and T007 affect separate wheel tests.
- T011, T015, and T018 affect separate test suites after shared contracts exist.
- Domain, wheel UI, and Rules test preparation can proceed independently.

## Implementation Strategy

1. Establish pure analytics models and tests.
2. Deliver the wheel color fix as the visual MVP.
3. Add transactional admin aggregates and callable.
4. Add dashboard UI and test-mode adapter.
5. Enforce route, callable, and Firestore access controls.
6. Backfill, validate, and run the full regression suite.
