# Tasks: Ruota singleton condivisa in rete

**Input**: Design documents from `specs/003-shared-singleton-wheel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: inclusi perché FR-026 e SC-002/SC-007 richiedono copertura esplicita di compatibilità, retry e concorrenza.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: allineare schemi e configurazione al nuovo stato condiviso.

- [X] T001 Estendere gli schemi di workspace e ruota con `stateRevision >= 0` e `revision >= 1` in packages/domain/src/schema.ts
- [X] T002 [P] Aggiornare il contratto TypeScript client con revisioni e stato di sincronizzazione in apps/web/src/features/groups/PayWheelProvider.tsx
- [X] T003 [P] Rendere obbligatoria la configurazione Firebase nelle build Vercel/CI condivise in apps/web/vite.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: creare primitive condivise usate da tutte le storie.

- [X] T004 Creare il generatore UUID compatibile e centralizzato in apps/web/src/services/ids/uuid.ts
- [X] T005 [P] Aggiungere test UUID nativo, fallback random bytes e fallback finale in apps/web/src/services/ids/uuid.test.ts
- [X] T006 Aggiornare bootstrap del workspace con `stateRevision: 0` e risposta autoritativa in functions/src/callable/internal-session.ts
- [X] T007 Aggiungere helper di revisione transazionale della ruota in functions/src/domain/shared-wheel.ts
- [X] T008 [P] Coprire gli helper di revisione e stato terminale in functions/test/domain/shared-wheel.test.ts

**Checkpoint**: schemi, identificatori e revisioni disponibili per tutte le user story.

---

## Phase 3: User Story 1 - Partecipare alla stessa ruota da più dispositivi (Priority: P1) 🎯 MVP

**Goal**: tutti i membri osservano e modificano una sola ruota Firestore.

**Independent Test**: due sessioni entrano quasi contemporaneamente e compaiono una volta sotto lo stesso `openOutingId`.

### Tests for User Story 1

- [X] T009 [P] [US1] Estendere i test Rules per letture condivise e divieto di scritture dirette in functions/test/rules/firestore.rules.test.ts
- [X] T010 [P] [US1] Aggiungere test del mapping snapshot/revisioni client in apps/web/src/features/groups/PayWheelProvider.test.ts

### Implementation for User Story 1

- [X] T011 [US1] Rendere create/join/leave transazionali su `openOutingId`, `revision` e `stateRevision` in functions/src/callable/outings.ts
- [X] T012 [US1] Applicare soltanto snapshot Firestore non obsoleti e propagare revisioni nel provider in apps/web/src/features/groups/PayWheelProvider.tsx
- [X] T013 [US1] Restituire revisione corrente dalla preview backend in functions/src/domain/preview-outing.ts e functions/src/callable/spin-outing.ts

**Checkpoint**: una ruota e una lista partecipanti condivise tra sessioni.

---

## Phase 4: User Story 2 - Osservare una sola estrazione condivisa (Priority: P1)

**Goal**: lo spin concorrente produce un solo risultato backend persistito.

**Independent Test**: due richieste con la stessa revisione producono un solo payer e la seconda riceve `replayed=true`.

### Tests for User Story 2

- [X] T014 [P] [US2] Aggiungere test di contratto per revisione obsoleta e replay del risultato in functions/test/domain/shared-wheel.test.ts
- [X] T015 [P] [US2] Aggiornare i test UI dello spin con revisioni e risultato remoto in apps/web/src/features/outings/WheelFlow.test.tsx

### Implementation for User Story 2

- [X] T016 [US2] Validare `expectedRevision`, incrementare le revisioni e mantenere il replay idempotente in functions/src/callable/spin-outing.ts
- [X] T017 [US2] Inviare la revisione attesa e riconciliare il risultato dal listener in apps/web/src/features/groups/PayWheelProvider.tsx

**Checkpoint**: risultato unico, autoritativo e visibile a nuovi client.

---

## Phase 5: User Story 3 - Usare l'app da smartphone tramite IP locale (Priority: P1)

**Goal**: sessioni e richieste funzionano anche senza UUID nativo.

**Independent Test**: con `crypto.randomUUID` assente, ingresso e chiamate producono UUID validi senza eccezioni.

### Implementation for User Story 3

- [X] T018 [US3] Sostituire la generazione request ID con l'utility compatibile in apps/web/src/services/firebase/callable.ts
- [X] T019 [US3] Sostituire gli ID di sessione e ruota demo con l'utility compatibile in apps/web/src/features/entry/adapters/localTestSessionAdapter.ts e apps/web/src/features/groups/PayWheelProvider.tsx

**Checkpoint**: nessuna chiamata diretta a `crypto.randomUUID()` resta nel client.

---

## Phase 6: User Story 4 - Recuperare sincronizzazione e connessione (Priority: P2)

**Goal**: il client distingue replica cache e stato server, bloccando azioni non sincronizzate.

**Independent Test**: durante offline/cache il client segnala lo stato e alla riconnessione applica la revisione server più recente.

### Tests for User Story 4

- [X] T020 [P] [US4] Aggiungere test UI per azioni disabilitate durante stato non sincronizzato in apps/web/src/features/outings/MinimalOutingFlow.test.tsx

### Implementation for User Story 4

- [X] T021 [US4] Esporre `synced` dai metadata dei listener e non accettare downgrade di revisione in apps/web/src/features/groups/PayWheelProvider.tsx
- [X] T022 [US4] Mostrare stato di sincronizzazione e bloccare mutazioni condivise in apps/web/src/features/outings/OutingPage.tsx

**Checkpoint**: riconnessione automatica senza presentare mutazioni locali come confermate.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T023 [P] Aggiornare configurazione e procedura di pubblicazione condivisa in README.md e apps/web/.env.example
- [ ] T024 Eseguire lint, typecheck, test, build e test Rules secondo specs/003-shared-singleton-wheel/quickstart.md — lint, typecheck, test, build ed E2E superati; test Rules bloccati dall'assenza di Java locale
- [X] T025 Verificare che tutti i requisiti implementati siano tracciati e marcare completati i task in specs/003-shared-singleton-wheel/tasks.md

---

## Dependencies & Execution Order

- Phase 1 precede Phase 2.
- Phase 2 blocca tutte le user story.
- US1 precede US2 perché lo spin usa le revisioni della ruota condivisa.
- US3 può procedere dopo Phase 2 in parallelo a US1.
- US4 dipende dai listener e dalle revisioni completati in US1.
- Polish segue le storie implementate.

## Parallel Opportunities

- T002 e T003 possono procedere dopo T001 su file diversi.
- T005 e T008 testano primitive indipendenti.
- T009 e T010 coprono backend Rules e client mapping in parallelo.
- T014 e T015 coprono backend e UI dello spin in parallelo.
- T020 può essere scritto mentre viene completata US3.

## Implementation Strategy

### MVP

Completare Phase 1, Phase 2 e US1: una sola ruota persistita e partecipanti condivisi.

### Incremental Delivery

1. Singleton e partecipanti condivisi.
2. Spin autoritativo concorrente.
3. Compatibilità mobile/IP.
4. Stato offline e riconnessione.
5. Configurazione Firebase/Vercel e validazione completa.
