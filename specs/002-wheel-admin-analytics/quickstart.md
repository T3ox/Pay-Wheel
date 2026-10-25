# Quickstart: validazione colori ruota e dashboard admin

Questa guida valida la feature end-to-end. Non sostituisce i dettagli in [data-model.md](./data-model.md) e nei [contratti](./contracts/).

## Prerequisites

- Node.js 22 e dipendenze del monorepo installate.
- Java disponibile per Firebase Emulator Suite.
- Browser evergreen.
- Per il flusso production-like: Firebase CLI configurata e variabili emulator previste dal progetto.

## 1. Baseline

Da root repository:

```bash
npm run typecheck
npm test
```

**Expected**: dominio, web app e Functions completano senza errori prima dei test della nuova feature.

## 2. Unit test della ruota

```bash
npm run test -w @pay-wheel/web -- wheelPalette WheelFlow
```

**Expected**:

- 1, 8, 9 e 25 partecipanti ricevono fill validi;
- nessuno spicchio usa `url(#protectedPattern)`;
- protetti conservano il colore personale e hanno overlay/stato testuale;
- il colore etichetta è leggibile sul relativo fill;
- fallback valido per utente mancante o input vuoto.

## 3. Unit test degli aggregati

```bash
npm run test -w @pay-wheel/domain -- admin-analytics
npm run test -w @pay-wheel/functions -- admin-analytics
```

**Expected**:

- conteggi e importi vengono incrementati una volta per outing;
- i protetti non aumentano le partecipazioni eleggibili;
- correzioni applicano soltanto il delta importo;
- merge all-time ricalcola percentuali dai conteggi;
- denominatori zero/incompleti producono `null`.

## 4. Security Rules

Avviare gli emulatori in un terminale:

```bash
npm run emulators
```

In un secondo terminale:

```bash
npm run test:rules
```

**Expected**:

- anonimo e membro non possono leggere `adminAnalytics`;
- neppure l'admin legge/scrive direttamente la collezione dal client;
- i dati restano accessibili soltanto tramite la callable autorizzata;
- le letture già consentite a classifica e storico non regrediscono.

## 5. Callable con ruoli diversi

Con Emulator Suite attiva, preparare tre identità: anonima, membro attivo e admin attivo. Richiedere settimana corrente e all-time.

**Expected**:

| Actor | Result |
|-------|--------|
| anonymous | `UNAUTHENTICATED` |
| member | `ADMIN_REQUIRED` senza payload dati |
| admin | response conforme a `contracts/admin-analytics-callable.md` |
| revoked admin | richiesta successiva negata e cache UI rimossa |

## 6. Backfill in emulatore

Caricare fixture con:

- uscita manuale;
- pagamento automatico corretto;
- partecipante protetto;
- outing storico privo di fairness snapshot.

Eseguire il comando di backfill implementato dalla feature due volte.

**Expected**:

- la seconda esecuzione produce gli stessi documenti della prima;
- `sourcePaymentCount` coincide con i pagamenti validi;
- la correzione sostituisce l'importo automatico;
- la fonte incompleta aumenta `incompleteSourceCount` e non inventa una percentuale.

## 7. Test mode UI

```bash
VITE_TEST_MODE=true npm run dev
```

Aprire l'URL mostrato da Vite, entrare e popolare una sessione demo con almeno 9 persone, includendo una persona protetta.

**Expected**:

- ogni spicchio ha un colore pieno e lo stato protetto è riconoscibile;
- nessuna richiesta Firebase parte nel test mode;
- un utente demo admin vede `Dashboard admin`;
- selettore periodo, ordinamento, empty state e valori null funzionano con aggregati locali.

## 8. Production-like UI

Con emulatori e web app collegati:

1. accedere come membro e tentare `/admin/dashboard`;
2. accedere come admin e aprire la dashboard;
3. selezionare settimana e all-time;
4. revocare l'accesso admin e premere `Riprova`/cambiare periodo.

**Expected**:

- membro reindirizzato senza flash di dati;
- admin vede totali e righe coerenti con fixture;
- revoca cancella i dati e reindirizza alla ruota;
- nessun dato admin resta in localStorage/sessionStorage.

## 9. Accessibility and responsive review

Verificare ruota e dashboard con:

- tastiera soltanto;
- screen reader;
- viewport 320 px;
- zoom 200%;
- modalità alto contrasto;
- `prefers-reduced-motion`.

**Expected**:

- focus visibile e ordine logico;
- stato protetto annunciato senza dipendere dal colore;
- intestazioni/etichette associano ogni metrica alla persona;
- ordinamento annunciato;
- nessuno scroll orizzontale necessario per leggere una riga;
- spin ridotto non cambia fill o comprensione.

## 10. Full regression

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

**Expected**: tutti i gate passano, inclusi fairness, pagamento, classifica, storico, accesso e PWA.

## Evidence to retain

- output test dominio/web/functions/rules;
- screenshot ruota con 9 e 25 partecipanti e stato protetto;
- screenshot dashboard desktop e 320 px con dati non sensibili di fixture;
- confronto backfill ↔ pagamenti per settimana;
- prova accesso negato per membro e revoca admin.

## Implementation evidence (2026-10-25)

- Domain analytics: 6 unit tests covering aggregation, protected participants, corrections, idempotent rebuild, all-time merge and null denominators.
- Functions analytics repository: 3 unit tests covering replay, correction delta and incomplete eligibility.
- Wheel: 10 focused tests covering palette sizes through 25 participants, contrast and protected-segment rendering without SVG pattern fills.
- Admin dashboard: 4 component tests covering summary, sorting, period selection, empty/incomplete states and direct-route denial.
- Firestore Rules: direct read/write denial scenarios added for member and admin clients; execution requires `FIRESTORE_EMULATOR_HOST`.
- Backfill command: `npm run backfill:admin-analytics -w @pay-wheel/functions` (run only with the intended Firebase project credentials/environment).
