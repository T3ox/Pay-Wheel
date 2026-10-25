# Tasks: Pay Wheel interna e minimale

**Input**: documenti in `specs/001-fair-coffee-wheel/`  
**Tests**: obbligatori per FR-027 e per i quality gate del piano.  
**Format**: `[ID] [P?] [Story?] Descrizione con percorso`.

## Phase 1: Setup

**Purpose**: configurare i due runtime e impedire che test mode raggiunga produzione.

- [X] T001 Aggiornare variabili test/production e validazione ambiente in `.env.example` e `apps/web/src/config/env.ts`
- [X] T002 [P] Aggiornare metadata e colori PWA per il nuovo visual system in `apps/web/vite.config.ts`
- [X] T003 [P] Verificare ignore Node, env, build e report in `.gitignore`, `.prettierignore` ed `eslint.config.js`

---

## Phase 2: Foundational

**Purpose**: introdurre workspace interno, session abstraction e contratti condivisi.

- [X] T004 Scrivere i test iniziali per entry DOM, test-mode isolation e session restore in `apps/web/src/features/entry/EntryPage.test.tsx`
- [X] T005 [P] Definire `SessionUser`, `SessionAdapter` e stato sessione in `apps/web/src/features/entry/session.ts`
- [X] T006 Implementare config workspace, allowlist dominio e autorizzazione admin claim in `functions/src/platform/firebase.ts`
- [X] T007 [P] Aggiornare intent Security Rules per membership singleton e deny inviti in `firebase/firestore.rules`
- [X] T008 [P] Aggiornare tipi membership/workspace compatibili in `packages/domain/src/schema.ts`

**Checkpoint**: runtime e dominio possono distinguere test locale e produzione interna.

---

## Phase 3: User Story 1 — Entrare con un gesto (P1) 🎯 MVP

**Goal**: una sola CTA iniziale, sessione locale senza Firebase e bootstrap aziendale in produzione.

**Independent Test**: con `VITE_TEST_MODE=true`, aprire `/`, vedere soltanto `Aggiungimi`, fare click e arrivare alla ruota senza richieste Firebase.

- [X] T009 [US1] Implementare adapter locale persistito senza import Firebase in `apps/web/src/features/entry/adapters/localTestSessionAdapter.ts`
- [X] T010 [US1] Implementare adapter Google e bootstrap produzione in `apps/web/src/features/entry/adapters/firebaseSessionAdapter.ts`
- [X] T011 [US1] Implementare provider unificato con enter/restore/sign-out in `apps/web/src/features/entry/SessionProvider.tsx`
- [X] T012 [US1] Implementare entry full-screen a singola CTA e feedback post-interazione in `apps/web/src/features/entry/EntryPage.tsx`
- [X] T013 [US1] Implementare callable idempotente `bootstrapInternalSession` in `functions/src/callable/internal-session.ts` ed esportarla da `functions/src/index.ts`
- [X] T014 [US1] Sostituire auth/onboarding routing con ingresso diretto in `apps/web/src/main.tsx` e `apps/web/src/app/App.tsx`

**Checkpoint**: US1 funziona senza Firebase in test e auto-provisiona il workspace fisso in produzione.

---

## Phase 4: User Story 2 — Partecipare ed estrarre (P1)

**Goal**: ruota full-screen, una sola CTA per stato e backend senza groupId selezionabile.

**Independent Test**: due partecipanti entrano, ottengono la stessa preview e un solo payer; una preview stale non estrae.

- [X] T015 [US2] Scrivere test della primary-action precedence e details sheet in `apps/web/src/features/outings/MinimalOutingFlow.test.tsx`
- [X] T016 [US2] Rifattorizzare stato locale/realtime su workspace fisso e rimuovere API gruppi da `apps/web/src/features/groups/PayWheelProvider.tsx`
- [X] T017 [US2] Unificare create/join/leave nella callable senza groupId `joinCurrentOuting` in `functions/src/callable/outings.ts`
- [X] T018 [US2] Rimuovere groupId dai contratti preview/spin/payment in `functions/src/callable/spin-outing.ts`, `functions/src/callable/confirm-payment.ts` e `functions/src/callable/payment-lifecycle.ts`
- [X] T019 [US2] Implementare shell minima e menu secondario accessibile in `apps/web/src/app/MinimalShell.tsx`
- [X] T020 [US2] Implementare outing full-screen, singola CTA e pannello dettagli in `apps/web/src/features/outings/OutingPage.tsx` e `apps/web/src/features/outings/OutingDetailsSheet.tsx`
- [X] T021 [US2] Applicare palette originale, segmenti stabili e result full-screen in `apps/web/src/features/outings/Wheel.tsx` e `apps/web/src/features/outings/DrawResult.tsx`
- [X] T022 [US2] Sostituire shell/card/gradienti con il visual system piatto in `apps/web/src/styles/tokens.css` e `apps/web/src/styles/app.css`

**Checkpoint**: la ruota è il centro dell'esperienza e il backend opera solo sul workspace interno.

---

## Phase 5: User Story 3 — Registrare la spesa (P2)

**Goal**: preservare pagamento, protezione e correzione sostituendo owner con admin claim.

**Independent Test**: il payer registra una spesa una sola volta e payer/admin correggono un pagamento automatico entro la settimana.

- [X] T023 [US3] Aggiornare autorizzazione correzione e messaggi pagamento in `functions/src/callable/payment-lifecycle.ts`
- [X] T024 [US3] Adattare dialog pagamento e result alla singola primary action in `apps/web/src/features/payments/PaymentDialog.tsx` e `apps/web/src/features/outings/DrawResult.tsx`
- [X] T025 [US3] Aggiornare test pagamento e regressione fairness/protezione in `apps/web/src/features/payments/PaymentForm.test.tsx` e `functions/test/domain/payment-policy.test.ts`

---

## Phase 6: User Story 4 — Consultare equità e storico (P3)

**Goal**: mantenere classifica, storico e profilo dietro il menu secondario, senza gestione gruppo.

**Independent Test**: un utente autenticato apre le tre viste dal menu; nessuna route/stringa espone gruppi o inviti.

- [X] T026 [US4] Adattare classifica, storico e profilo al layout piatto in `apps/web/src/features/leaderboard/LeaderboardPage.tsx`, `apps/web/src/features/history/HistoryPage.tsx` e `apps/web/src/features/settings/AccountSettingsPage.tsx`
- [X] T027 [US4] Rimuovere route e codice client per onboarding/impostazioni gruppo in `apps/web/src/app/App.tsx` e `apps/web/src/features/groups/`
- [X] T028 [US4] Rimuovere export callable multi-gruppo e rendere gli endpoint legacy non distribuibili in `functions/src/index.ts`

---

## Phase 7: Polish & Cross-Cutting

- [X] T029 [P] Aggiornare smoke E2E per singola CTA, percorso locale e assenza group UX in `e2e/app.spec.ts` e `e2e/full-flow.spec.ts`
- [X] T030 [P] Aggiornare istruzioni di avvio e modalità test in `README.md`
- [X] T031 Eseguire lint, typecheck, test, build e validazione quickstart; correggere regressioni nei file coinvolti
- [X] T032 Verificare hooks post-implementazione e completare le checkbox in `specs/001-fair-coffee-wheel/tasks.md`

---

## Phase 8: Spin Motion

- [X] T033 [US2] Aggiungere test deterministici per rotazione, allineamento del pagante e reduced motion in `apps/web/src/features/outings/wheelMotion.test.ts`
- [X] T034 [US2] Restituire l'esito autoritativo dello spin e animare la ruota verso il segmento estratto in `apps/web/src/features/groups/PayWheelProvider.tsx`, `apps/web/src/features/outings/OutingPage.tsx`, `apps/web/src/features/outings/wheelMotion.ts` e `apps/web/src/styles/app.css`
- [X] T035 Eseguire test, lint, typecheck e build; verificare gli hook post-implementazione

---

## Phase 9: Wheel/Result Color Consistency

- [X] T036 [US2] Aggiungere test di regressione per l'assegnazione condivisa dei colori in `apps/web/src/features/outings/wheelPalette.test.ts`
- [X] T037 [US2] Condividere palette e risoluzione del colore tra spicchi e risultato in `apps/web/src/features/outings/wheelPalette.ts`, `apps/web/src/features/outings/Wheel.tsx`, `apps/web/src/features/outings/DrawResult.tsx` ed `e2e/full-flow.spec.ts`
- [X] T038 Eseguire test, lint, typecheck, build ed E2E; verificare gli hook post-implementazione

---

## Dependencies & Execution Order

```text
Setup → Foundational → US1 → US2 → US3 → US4 → Polish
```

- US1 dipende dalla session abstraction.
- US2 dipende da sessione e workspace fisso.
- US3 dipende dallo stato outing di US2.
- US4 può essere rifinita dopo la shell minima di US2.
- I test di ogni storia precedono l'implementazione associata.

## Parallel Opportunities

- T002/T003 possono procedere dopo T001 senza toccare gli stessi file.
- T007/T008 sono indipendenti dal test UI T004.
- T029/T030 sono indipendenti dopo il completamento delle storie.

## Implementation Strategy

Il primo incremento dimostrabile è Phase 1–3: ingresso locale con un click. Il rilascio completo richiede Phase 4–7 perché la rimozione del multi-gruppo deve essere coerente tra client, Functions, Rules e documentazione.
