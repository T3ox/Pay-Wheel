# Quickstart and Validation: UI essenziale interna

## Prerequisites

- Node.js 22 LTS e npm.
- Per test mode non servono Firebase, Java o rete.
- Per produzione/emulatori: Java 21 e Firebase CLI.

## Fast visual test without Firebase

Configurare in `apps/web/.env.local`:

```text
VITE_TEST_MODE=true
```

Avviare:

```bash
npm ci
npm run dev
```

Expected result su `http://localhost:5173`:

1. L'apertura mostra solo `Aggiungimi` su fondo pieno.
2. Non compaiono logo, titolo, descrizione, scelta Google/demo o navigazione.
3. Il click crea una sessione locale, apre/recupera l'uscita e aggiunge l'utente.
4. Il refresh conserva attore e stato locale.
5. Network panel non mostra richieste a Firebase.

Per resettare il test usare il comando sviluppatore previsto o cancellare esclusivamente le chiavi `pay-wheel:test-*` da DevTools.

## Production-like local setup

```text
VITE_TEST_MODE=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_FIREBASE_EMULATORS=true
```

Configurazione Functions:

```text
INTERNAL_GROUP_ID=company
INTERNAL_ALLOWED_DOMAINS=example.com
```

Avvio:

```bash
npm run emulators
npm run dev
```

La CTA iniziale è `Entra`; dopo l'autenticazione l'utente viene auto-provisionato nel workspace interno e aggiunto all'uscita corrente. Nessun onboarding intermedio è ammesso.

## Common validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:rules
npm run test:e2e -- --project=chromium
npm run test:lighthouse
```

La CI production deve fallire se `VITE_TEST_MODE=true`.

## Mandatory scenarios

### Entry

- Query DOM iniziale: esiste un solo button visibile e nessun heading/paragrafo/nav.
- Tastiera: un Tab raggiunge la CTA; Enter e Space la attivano.
- Test mode: `Aggiungimi` non importa né inizializza Firebase.
- Production: `Entra` mantiene loading nella CTA e mostra errori solo dopo tentativo.
- Account fuori dominio: accesso negato senza creare user/membership.

### No-group guarantee

- Le route `/onboarding/group` e `/settings/group` non esistono.
- Nessuna stringa UI contiene “crea gruppo”, “codice invito”, “owner” o “archivia gruppo”.
- Le callable gruppo/invito restituiscono `FUNCTION_REMOVED` e non scrivono dati.
- Il client non invia mai un `groupId` alle callable nuove.

### Outing

- Primo join crea l'uscita e il partecipante una sola volta.
- Join ripetuto con lo stesso request ID è idempotente.
- Con due partecipanti compare una sola CTA primaria `Gira`.
- Stale preview aggiorna il dettaglio senza produrre un risultato.
- Due spin simultanei producono un unico payer.
- Riapertura durante spin mostra il risultato persistito.

### Visual simplicity

- Screenshot mobile 320×640, mobile standard, tablet e desktop.
- Nessuna sidebar o bottom nav persistente.
- Nessuna card decorativa, gradient, ombra forte o emoji.
- Wheel e CTA restano il centro visivo; il menu secondario è discreto.
- I colori partecipante sono stabili ma il dettaglio resta leggibile in scala di grigi.

### Payment and fairness regression

- I vettori fairness esistenti producono gli stessi pesi e payer eligibility.
- Pagante protetto fino al lunedì successivo.
- Pagamento automatico dopo un'ora resta `130 × partecipanti + 200` centesimi.
- Correzione autorizzata a payer o admin claim, mai a un owner di gruppo.

### Accessibility

- VoiceOver/NVDA annuncia CTA, loading, errore e risultato.
- Zoom 200% e viewport 320 px non tagliano CTA/menu/dialog.
- Reduced motion elimina rotazioni multiple.
- Il details sheet offre lista semantica di nomi, probabilità e protezioni.

## Rollout checklist

1. Identificare e configurare il workspace aziendale esistente.
2. Eseguire backup Firestore.
3. Deploy preview con test mode per approvazione visuale.
4. Deploy staging con Firebase Emulator/allowlist reale.
5. Verificare che il client non esponga più gruppi e inviti.
6. Disabilitare le callable obsolete.
7. Osservare error rate, latenza join/spin e access denied per un rilascio.
8. Rinviare ogni cancellazione dati a una attività separata.
