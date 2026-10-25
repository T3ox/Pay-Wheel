# Quickstart: Validare la ruota singleton condivisa

## Prerequisiti

- Node.js compatibile con il repository
- Java per Firestore Emulator
- Firebase CLI autenticata per il progetto di test
- due profili browser o due dispositivi

## Configurazione emulatori

Creare `apps/web/.env.local` con i valori pubblici della Web App Firebase e:

```text
VITE_TEST_MODE=false
VITE_USE_FIREBASE_EMULATORS=true
```

Configurare Functions:

```text
INTERNAL_GROUP_ID=company
INTERNAL_ALLOWED_DOMAINS=example.com
```

Avviare:

```bash
npm run emulators
npm run dev -- -- --host
```

## Verifiche automatiche

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx firebase emulators:exec --project demo-pay-wheel --only firestore "npm run test:rules"
npm run test:e2e -- --project=chromium
```

## Scenario 1 — Singleton e join concorrente

1. Aprire l'app in due sessioni autenticate.
2. Selezionare l'ingresso quasi contemporaneamente.
3. Verificare che `groups/company.openOutingId` contenga un solo ID.
4. Verificare due documenti partecipante sotto la stessa ruota.
5. Ricaricare entrambe le pagine: non devono apparire duplicati.

## Scenario 2 — Spin backend concorrente

1. Aggiungere almeno due partecipanti e attendere la stessa preview.
2. Avviare lo spin contemporaneamente da due sessioni.
3. Verificare un solo `payerUserId` persistito.
4. Verificare che entrambe le risposte e tutti i listener mostrino lo stesso pagante.
5. Un terzo client aperto dopo lo spin deve vedere immediatamente quel risultato.

## Scenario 3 — Compatibilità UUID

1. Eseguire i test della utility disabilitando la capacità UUID nativa.
2. Aprire la build via `http://<ip-locale>:<porta>`.
3. Verificare che ingresso e request ID non generino eccezioni.
4. Ripetere sulla preview HTTPS Vercel.

## Scenario 4 — Riconnessione

1. Portare offline un client dopo il primo snapshot.
2. Aggiungere o rimuovere un partecipante da un altro client.
3. Ripristinare la connessione.
4. Verificare convergenza entro 3 secondi e assenza di mutazioni duplicate.

## Pubblicazione Vercel

La build condivisa richiede `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` e `VITE_TEST_MODE=false`. Se mancano, la build Vercel deve fallire invece di pubblicare la demo browser-only.
