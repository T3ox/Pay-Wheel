# Pay Wheel

PWA React essenziale per scegliere in modo equo chi paga durante le uscite al bar tra colleghi. L'app usa un solo workspace aziendale preconfigurato: non esistono gruppi da creare o inviti da condividere.

## Avvio locale

Richiede Node.js 22 e npm.

```bash
npm install
npm run dev
```

Per esporre il server di sviluppo agli altri dispositivi della stessa rete:

```bash
npm run dev -- --host 0.0.0.0
```

Aprire quindi dal telefono l'indirizzo `http://<IP-del-computer>:5173`. La modalità condivisa reale richiede comunque Firebase; la modalità test salva i dati soltanto nel browser del singolo dispositivo.

Senza credenziali Firebase l'app entra automaticamente in modalità test: all'apertura mostra soltanto **Aggiungimi** e salva sessione, ruota, pagamenti e classifica nel browser. Per renderlo esplicito creare `apps/web/.env.local`:

```text
VITE_TEST_MODE=true
```

Su `localhost`, con Firebase Auth configurato e gli emulatori disattivati, **Entra** autentica realmente l'account Google ma mantiene workspace, ruota e pagamenti nel browser. In questo modo lo sviluppo locale non dipende dalle callable di produzione protette da App Check. Attivando gli emulatori, anche il bootstrap torna a usare Functions e Firestore locali.

Per usare Auth, Firestore e Functions impostare `VITE_TEST_MODE=false`, compilare le variabili Firebase, configurare `INTERNAL_GROUP_ID` e `INTERNAL_ALLOWED_DOMAINS` lato Functions e avviare gli emulatori o distribuire il progetto.

## Ruota singleton condivisa

In produzione il client non conserva la ruota come fonte autoritativa. Tutti i dispositivi osservano lo stesso workspace Firestore:

- `groups/{INTERNAL_GROUP_ID}.openOutingId` punta all'unica ruota attiva;
- `groups/{groupId}/outings/{outingId}` contiene stato, risultato e `revision` monotona;
- `groups/{groupId}/outings/{outingId}/participants/{userId}` contiene un partecipante per utente;
- `groups/{groupId}.stateRevision` segnala ogni mutazione condivisa.

Join, leave, spin e chiusura sono eseguiti dalle Cloud Functions in transazioni. Lo spin riceve la revisione osservata dal client, calcola il pagante nel backend e persiste un solo risultato; una richiesta concorrente legge e riusa il risultato già registrato. Le Security Rules consentono ai membri di leggere lo stato condiviso ma vietano scritture dirette dal browser.

## Pubblicazione condivisa su Vercel

Vercel ospita la PWA HTTPS; Auth, stato realtime e calcolo dello spin restano su Firebase. Configurare nel progetto Vercel, per gli ambienti interessati:

```text
VITE_TEST_MODE=false
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_APP_CHECK_SITE_KEY=...
```

Configurare inoltre `INTERNAL_GROUP_ID` e `INTERNAL_ALLOWED_DOMAINS` nell'ambiente delle Functions, distribuire Functions/Rules/indici Firebase e aggiungere il dominio Vercel tra i domini autorizzati di Firebase Authentication. Le build Vercel falliscono intenzionalmente se mancano le variabili Firebase o se `VITE_TEST_MODE=true`, evitando di pubblicare per errore una demo locale non condivisa.

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
- [Specifica ruota singleton condivisa](specs/003-shared-singleton-wheel/spec.md)
- [Piano ruota singleton condivisa](specs/003-shared-singleton-wheel/plan.md)
- [Validazione multi-dispositivo](specs/003-shared-singleton-wheel/quickstart.md)

## Regole principali

Chi spende meno della media settimanale riceve una probabilità maggiore; chi ha già pagato nella settimana è protetto fino al lunedì successivo. Se dopo un’ora il pagante non registra l’importo, viene applicato automaticamente `1,30 € × partecipanti + 2,00 €`, correggibile dal pagante o da un amministratore interno entro la fine della settimana.
