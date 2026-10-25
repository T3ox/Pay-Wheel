# Implementation Plan: Ruota singleton condivisa in rete

**Branch**: `003-shared-singleton-wheel` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-shared-singleton-wheel/spec.md`

## Summary

Rendere il workspace Firebase interno la fonte autoritativa di una sola ruota attiva. Il documento singleton `groups/{INTERNAL_GROUP_ID}` mantiene il riferimento alla ruota corrente e una revisione monotona; la ruota e i partecipanti sono persistiti in Firestore, osservati in tempo reale da tutti i client e modificati soltanto tramite callable transazionali. L'estrazione resta interamente nel backend con casualità server-side e un solo risultato persistito. Il client centralizza inoltre la generazione degli identificatori con fallback compatibile e impedisce che una build pubblicata senza Firebase venga presentata come modalità condivisa.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 22 per Functions; browser ES2022 per la PWA

**Primary Dependencies**: React 19, Vite 7, Firebase Web SDK 13, Firebase Admin/Functions 7, Zod 4

**Storage**: Cloud Firestore; cache persistente Firestore solo come replica client, mai come autorità

**Testing**: Vitest, Firebase Emulator Suite e Rules Test Environment, Playwright per i flussi multi-sessione

**Target Platform**: browser desktop e mobile moderni; HTTPS Vercel in produzione; emulatori Firebase in sviluppo

**Project Type**: monorepo web application con PWA, backend serverless e pacchetto dominio condiviso

**Performance Goals**: propagazione degli aggiornamenti entro 2 secondi; riconnessione entro 3 secondi; animazione locale a 60 fps quando supportata

**Constraints**: una sola ruota aperta; massimo 25 partecipanti esistente e target validato di 20 dispositivi; risultato calcolato solo dal backend; operazioni idempotenti e transazionali; nessuna scrittura Firestore diretta dal client

**Scale/Scope**: un workspace aziendale, una ruota corrente, fino a 20 dispositivi simultanei e storico esistente invariato

## Constitution Check

La constitution presente è ancora il template non ratificato e non introduce gate applicabili. Si adottano comunque i gate già stabiliti dal progetto:

- logica di equità nel pacchetto dominio e coperta da test;
- mutazioni condivise esclusivamente nel backend;
- Firestore Rules deny-by-default e letture limitate ai membri;
- concorrenza, idempotenza e accessibilità verificate prima del rilascio;
- nessun nuovo servizio o database se Firestore soddisfa il requisito.

**Gate iniziale**: PASS. Il piano riusa l'architettura esistente e non richiede eccezioni.

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-singleton-wheel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── shared-wheel-callables.md
│   └── shared-wheel-realtime.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/src/
├── config/env.ts
├── features/entry/
│   └── adapters/
├── features/groups/PayWheelProvider.tsx
├── features/outings/
└── services/
    ├── firebase/
    └── ids/

functions/src/
├── callable/
│   ├── internal-session.ts
│   ├── outings.ts
│   └── spin-outing.ts
├── domain/preview-outing.ts
├── platform/firebase.ts
└── repositories/firestore.ts

packages/domain/src/
└── schema.ts

functions/test/
apps/web/src/**/*.test.ts*
firebase/firestore.rules
```

**Structure Decision**: mantenere i tre workspace esistenti. Il client osserva e presenta lo stato; Functions possiede tutte le transizioni; `packages/domain` conserva schemi e algoritmo deterministico condivisi.

## Design

### Singleton autoritativo

`groups/{INTERNAL_GROUP_ID}` resta l'unico aggregate root. `openOutingId` è il puntatore atomico alla ruota attiva e `stateRevision` aumenta per ogni mutazione accettata. Non viene introdotto un secondo singleton top-level, evitando due fonti di verità.

### Ciclo della ruota

1. Il bootstrap crea idempotentemente workspace, utente e membership.
2. Il primo join crea la ruota e assegna `openOutingId` nella stessa transazione.
3. Join e leave aggiornano partecipante, conteggio e revisione nella stessa transazione.
4. Il backend calcola la preview dai documenti correnti.
5. Lo spin ricalcola la preview nella transazione, rifiuta una versione obsoleta, estrae sul server e persiste un unico risultato.
6. I listener Firestore propagano il risultato a tutti i dispositivi.
7. Il pagamento conclude la ruota e azzera `openOutingId` nella stessa transazione.

### Compatibilità client

Un'unica utility genera UUID. Usa la capacità nativa quando disponibile, poi bytes casuali quando disponibili e infine un fallback temporale/casuale validato nel formato UUID v4. Sessioni e request ID passano sempre da questa utility.

### Pubblicazione condivisa

Una build destinata a Vercel/CI fallisce se mancano le variabili Firebase o se `VITE_TEST_MODE=true`. La demo locale resta disponibile soltanto in sviluppo dichiarato; una build condivisa usa Auth, Functions e listener Firestore.

## Constitution Check — Post Design

- Singolo database e singolo aggregate root: PASS.
- Autorità delle mutazioni nel backend: PASS.
- Contratti e modello dati documentati: PASS.
- Test previsti per concorrenza, regole, UUID e multi-sessione: PASS.
- Nessuna variazione all'algoritmo di equità o alle regole di pagamento: PASS.

## Complexity Tracking

Nessuna violazione o complessità aggiuntiva da giustificare.
