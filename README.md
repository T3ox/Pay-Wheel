# Pay Wheel

PWA React essenziale per scegliere in modo equo chi paga durante le uscite al bar tra colleghi. L'app usa un solo workspace aziendale preconfigurato: non esistono gruppi da creare o inviti da condividere.

## Avvio locale

Richiede Node.js 22 e npm.

```bash
npm install
npm run dev
```

Senza credenziali Firebase l'app entra automaticamente in modalità test: all'apertura mostra soltanto **Aggiungimi** e salva sessione, ruota, pagamenti e classifica nel browser. Per renderlo esplicito creare `apps/web/.env.local`:

```text
VITE_TEST_MODE=true
```

Per usare Auth, Firestore e Functions impostare `VITE_TEST_MODE=false`, compilare le variabili Firebase, configurare `INTERNAL_GROUP_ID` e `INTERNAL_ALLOWED_DOMAINS` lato Functions e avviare gli emulatori o distribuire il progetto.

## Verifiche

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --project=chromium
```

I test delle Security Rules richiedono Java e il Firestore Emulator:

```bash
npx firebase emulators:exec --project demo-pay-wheel --only firestore "npm run test:rules"
```

## Struttura

- `apps/web`: React, Vite e PWA responsive.
- `functions`: bootstrap del workspace interno, callable e job Firebase, incluso il pagamento automatico dopo un’ora.
- `packages/domain`: algoritmo fairness, importi, settimana Europe/Rome e schemi condivisi.
- `specs/001-fair-coffee-wheel`: specifiche e backlog Spec-kit.
- `docs`: runbook operativi e verifiche di rilascio.

## Feature documentation

- [Specifiche funzionali](specs/001-fair-coffee-wheel/spec.md)
- [Piano di implementazione](specs/001-fair-coffee-wheel/plan.md)
- [Decisioni e ricerca](specs/001-fair-coffee-wheel/research.md)
- [Modello dati](specs/001-fair-coffee-wheel/data-model.md)
- [UI/UX e design system](specs/001-fair-coffee-wheel/ui-ux-spec.md)
- [Contratti backend](specs/001-fair-coffee-wheel/contracts/callable-functions.md)
- [Contratti realtime e permessi](specs/001-fair-coffee-wheel/contracts/realtime-data.md)
- [Guida di validazione](specs/001-fair-coffee-wheel/quickstart.md)
- [Backlog eseguibile](specs/001-fair-coffee-wheel/tasks.md)

## Regole principali

Chi spende meno della media settimanale riceve una probabilità maggiore; chi ha già pagato nella settimana è protetto fino al lunedì successivo. Se dopo un’ora il pagante non registra l’importo, viene applicato automaticamente `1,30 € × partecipanti + 2,00 €`, correggibile dal pagante o da un amministratore interno entro la fine della settimana.
