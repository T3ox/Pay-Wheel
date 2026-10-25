# Implementation Plan: colori ruota e dashboard amministrativa

**Branch**: `002-wheel-admin-analytics` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: correggere gli spicchi protetti che oggi usano `fill: url(#protectedPattern)`, rendere la palette più chiara e aggiungere una dashboard privata per amministratori con spese e frequenze di estrazione per persona.

## Summary

La ruota manterrà sempre il colore stabile del partecipante. Lo stato `protected` non sostituirà più il riempimento con un pattern SVG: verrà comunicato tramite un bordo interno tratteggiato, un indicatore testuale/semantico e la lista accessibile. La palette verrà estesa e il colore delle etichette verrà scelto in base alla luminanza per mantenere leggibilità e fallback sicuri.

La nuova route `/admin/dashboard` sarà visibile soltanto a membership con `access: admin`, protetta sia nel router sia nella callable autoritativa `getAdminAnalytics`. I dati saranno letti da riepiloghi settimanali amministrativi aggiornati atomicamente quando un pagamento viene concluso o corretto. La dashboard supporterà settimana corrente, settimane storiche e tutto lo storico, mostrando totale speso, estrazioni, partecipazioni eleggibili, tasso personale e quota sul totale delle uscite.

## Technical Context

**Language/Version**: TypeScript 5.9 strict; Node.js 22 LTS

**Primary Dependencies**: React 19, React Router 7, Vite 7, Firebase Web SDK 13, Firebase Functions 7, Firebase Admin 14, Zod 4

**Storage**: Firestore per dati condivisi e riepiloghi admin; localStorage isolato per test mode

**Testing**: Vitest, React Testing Library, Firebase Emulator Suite e Playwright

**Target Platform**: web responsive e PWA installabile, mobile-first, browser evergreen

**Project Type**: monorepo web app + Firebase Functions + dominio TypeScript condiviso

**Performance Goals**: ruota a 60 fps durante lo spin; dashboard aggiornata entro 2 secondi per 2.000 uscite e 200 persone; nessuna scansione completa delle uscite sul percorso normale

**Constraints**: WCAG 2.2 AA; autorizzazione admin verificata server-side; importi in centesimi EUR; percentuali deterministiche; compatibilità con dati storici e test mode senza Firebase

**Scale/Scope**: singolo workspace interno, massimo 25 partecipanti per uscita, fino a 200 persone e circa 2.000 uscite storiche

## Constitution Check

La costituzione del repository contiene ancora placeholder e non definisce gate ratificati. Si applicano i vincoli architetturali già adottati dal progetto:

- PASS — la modifica visiva non cambia pesi, probabilità o selezione del pagante;
- PASS — l'accesso admin è verificato da una callable e non dipende dal solo routing client;
- PASS — gli aggregati sono aggiornati insieme al pagamento, evitando conteggi duplicati e scansioni costose;
- PASS — correzioni e backfill sono idempotenti e preservano audit e storico;
- PASS — la protezione resta percepibile senza dipendere dal colore o dal movimento;
- PASS — test mode e produzione usano lo stesso calcolo di dominio ma adapter di storage distinti.

**Post-design re-check**: PASS. La nuova collezione amministrativa è negata ai client dalle Security Rules; i membri continuano a vedere soltanto le sezioni già previste, mentre il report completo viene restituito esclusivamente dalla callable dopo una verifica autoritativa del ruolo.

## Project Structure

### Documentation (this feature)

```text
specs/002-wheel-admin-analytics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── admin-analytics-callable.md
    └── admin-dashboard-ui.md
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   └── MinimalShell.tsx
├── features/
│   ├── admin/
│   │   ├── AdminDashboardPage.tsx
│   │   ├── AdminRouteGate.tsx
│   │   ├── adminAnalytics.ts
│   │   └── AdminDashboardPage.test.tsx
│   ├── entry/
│   │   └── SessionProvider.tsx
│   ├── groups/
│   │   └── PayWheelProvider.tsx
│   └── outings/
│       ├── Wheel.tsx
│       ├── ParticipantList.tsx
│       ├── wheelPalette.ts
│       └── wheelPalette.test.ts
└── styles/
    ├── app.css
    └── tokens.css

functions/src/
├── callable/
│   ├── admin-analytics.ts
│   ├── confirm-payment.ts
│   └── payment-lifecycle.ts
├── repositories/
│   ├── admin-analytics.ts
│   └── firestore.ts
└── index.ts

functions/test/
├── admin-analytics.test.ts
└── rules/
    └── firestore.rules.test.ts

packages/domain/src/
├── admin-analytics.ts
├── admin-analytics.test.ts
└── index.ts

firebase/
└── firestore.rules
```

**Structure Decision**: mantenere il monorepo esistente. Il calcolo puro e i tipi degli aggregati vivono in `packages/domain`; Functions applica autorizzazione e persistenza; la web app si limita a visualizzazione, ordinamento e filtro. La palette resta nella feature outing perché è una responsabilità puramente visuale.

## Architecture

### Rendering della ruota

```text
FairnessEntry[]
  └── getWheelSegmentStyle(entries, userId)
      ├── fill: colore partecipante sempre valido
      ├── labelColor: nero/bianco da luminanza
      └── protected: bordo interno tratteggiato + stato semantico
```

- Eliminare il `<pattern id="protectedPattern">` e ogni `fill="url(...)"` dagli spicchi.
- Generare fino a 25 colori stabili da una palette curata con variazioni controllate di tonalità e luminosità; evitare due colori uguali in spicchi adiacenti.
- Mantenere un bordo scuro tra spicchi e calcolare il colore dell'etichetta per contrasto sul riempimento.
- Per `eligibility === protected`, sovrapporre un secondo path senza riempimento con tratteggio ad alto contrasto e mantenere `Protetto fino a lunedì` nella lista testuale.
- Se il calcolo del colore riceve dati mancanti, usare un colore fallback opaco e valido, mai un riferimento a risorsa SVG.

### Pipeline degli aggregati admin

```text
spinOuting
  └── fairnessSnapshot + eligibilityAtDraw
          │
confirmPayment / autoSettlePayments
          ├── payment finale
          ├── weeklySummaries esistente
          └── adminAnalytics/{weekId} (incremento idempotente)
                         │
correctAutomaticPayment ─┘ delta importo, nessun nuovo conteggio

getAdminAnalytics(admin, period)
  └── uno o più adminAnalytics settimanali
      └── merge deterministico → risposta dashboard
```

- Registrare per ogni pagamento gli ID dei partecipanti eleggibili al draw, oltre agli ID di tutti i partecipanti già salvati.
- Aggiornare `adminAnalytics/{weekId}` nella stessa transazione che conclude il pagamento: `completedOutingCount`, `totalSpentCents` e statistiche per persona.
- Una correzione modifica soltanto `spentCents` e `totalSpentCents` tramite delta; non incrementa estrazioni o partecipazioni.
- La callable `getAdminAnalytics` accetta `week` o `all`, controlla identità interna, membership attiva e accesso admin, poi restituisce righe già aggregate e percentuali in basis points.
- Per `all`, unire i documenti settimanali lato server. Con il volume previsto il numero di documenti è limitato alle settimane con uscite, non al numero delle uscite.
- Un backfill amministrativo idempotente ricostruisce i riepiloghi mancanti da pagamenti, outing e fairness snapshot prima di attivare la route in produzione.

### Autorizzazione

- `SessionProvider` conserva `membership.access` restituito da `bootstrapInternalSession` e lo rende disponibile alla shell.
- `MinimalShell` aggiunge `Dashboard admin` soltanto quando l'accesso corrente è `admin`.
- `AdminRouteGate` impedisce il rendering della pagina ai membri e reindirizza a `/`.
- La callable ripete la verifica usando la membership autoritativa e `hasInternalAdminClaim`; il controllo client non è considerato una barriera di sicurezza.
- `groups/{groupId}/adminAnalytics/{weekId}` non è leggibile o scrivibile direttamente dal client, inclusi gli amministratori.
- Dopo un errore `FORBIDDEN`, il client elimina i dati dashboard in memoria e torna alla ruota.

### Calcoli e arrotondamento

- `selectionRateBps = round(drawCount * 10_000 / eligibleParticipationCount)`; `null` se il denominatore è zero.
- `outingShareBps = round(drawCount * 10_000 / completedOutingCount)`; `null` se non esistono uscite concluse.
- Il server invia valori interi in basis points; il client formatta `bps / 100` con massimo due decimali.
- Le quote possono differire da 100,00% di pochi centesimi percentuali per arrotondamento indipendente; il totale esatto si verifica sui conteggi interi.
- Le righe includono persone storiche non più attive usando `displayNameSnapshot`; identità anonimizzate restano aggregate sotto il relativo ID storico o label anonimizzata.

## Implementation Sequence

### Phase A — dominio e compatibilità dati

1. Definire tipi, merge e calcoli basis points in `packages/domain/src/admin-analytics.ts`.
2. Estendere il record di pagamento con `eligibleParticipantUserIdsAtDraw` ricavato dal fairness snapshot.
3. Aggiungere fixture e test per protezioni, zero denominatore, correzioni e merge multi-settimana.
4. Definire lo script/backfill idempotente e il marker di versione dell'aggregato.

### Phase B — persistenza e autorizzazione server

1. Aggiungere repository e riferimento `adminAnalytics` con aggiornamento transazionale idempotente.
2. Collegare conferma manuale, pagamento automatico e correzione agli aggregati.
3. Implementare `getAdminAnalytics` con schema input/output e verifica admin autoritativa.
4. Negare esplicitamente l'accesso diretto alla nuova collezione nelle Security Rules.
5. Aggiungere test Functions e Rules per admin, membro, anonimo, revoca e replay.

### Phase C — colori e stati della ruota

1. Sostituire la palette ciclica da 8 colori con generazione/lookup stabile fino a 25 partecipanti.
2. Calcolare colore etichetta e fallback validi.
3. Rimuovere `protectedPattern` e mantenere il fill del partecipante per tutti gli stati.
4. Aggiungere bordo interno tratteggiato e stato semantico per la protezione.
5. Aggiornare unit test, test DOM e screenshot per ruote miste, 1, 8, 9 e 25 partecipanti.

### Phase D — dashboard web privata

1. Propagare `membership.access` dal bootstrap alla sessione condivisa.
2. Aggiungere route guard e voce menu condizionale.
3. Implementare pagina, selettore periodo, riepilogo e tabella responsive ordinabile.
4. Collegare la callable in produzione e l'aggregatore puro ai dati locali in test mode.
5. Gestire loading, empty, errore, offline, revoca e cancellazione dati in memoria.

### Phase E — backfill e rollout

1. Eseguire il backfill in emulatore e confrontare ogni settimana con pagamenti e outing noti.
2. Eseguire il backfill in staging, verificare conteggi e delta delle correzioni.
3. Distribuire backend e regole prima della route web, mantenendo la pagina nascosta finché il backfill non è completo.
4. Abilitare la dashboard agli amministratori e monitorare errori di autorizzazione o documenti mancanti.
5. Conservare la possibilità di disabilitare la route senza rimuovere gli aggregati; nessuna migrazione distruttiva è prevista.

## Quality Gates

1. **Wheel fill**: nessun path partecipante usa `url(#protectedPattern)` o un fill non valido; ogni stato mantiene un colore opaco.
2. **Wheel semantics**: protezione comprensibile tramite lista testuale e indicatore grafico non basato solo sul colore.
3. **Palette**: nessuna coppia di spicchi adiacenti usa lo stesso colore fino a 25 partecipanti; etichette rispettano il contrasto previsto.
4. **Calculation**: fixture note producono totali, draw count, eligible count e basis points attesi.
5. **Idempotency**: retry di conferma, auto-settle, correzione e backfill non raddoppiano conteggi o importi.
6. **Authorization**: anonimo e membro ricevono `PERMISSION_DENIED`; admin attivo riceve dati; revoca blocca la richiesta successiva.
7. **Direct access**: Firestore Rules negano lettura e scrittura diretta di `adminAnalytics` a ogni client.
8. **Responsive accessibility**: dashboard utilizzabile a 320 px, zoom 200%, tastiera e screen reader; tabella ha intestazioni e ordinamento annunciati.
9. **Performance**: risposta dashboard entro 2 secondi sul dataset di 2.000 uscite/200 persone; UI non blocca lo spin.
10. **Regression**: test fairness, pagamenti, classifica, storico, entry e PWA restano verdi.

## Migration and Rollback

- Aggiungere i campi nuovi in modo additivo; pagamenti storici senza `eligibleParticipantUserIdsAtDraw` vengono completati dal fairness snapshot durante il backfill.
- Usare `aggregateVersion: 1` e `sourcePaymentCount` per verificare la completezza per settimana.
- Se un outing storico non contiene il dettaglio necessario, segnalarlo come `incompleteSourceCount` e mostrare il tasso personale come non disponibile anziché assumere zero.
- Il rollback della web app rimuove route e menu senza toccare dati storici o algoritmo fairness.
- Il rollback del backend interrompe l'aggiornamento dei nuovi aggregati ma non altera pagamenti e riepiloghi esistenti; il backfill può riallineare i delta al ripristino.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nuovo riepilogo `adminAnalytics` accanto a `weeklySummaries` | Separa dati e metriche amministrative, supporta eleggibilità e accesso server-only | Estendere il riepilogo leggibile dai membri esporrebbe le nuove metriche private e non garantirebbe il requisito di accesso admin |
| Backfill versionato | I pagamenti esistenti non contengono sempre il set eleggibile richiesto per il denominatore | Considerare tutti i partecipanti eleggibili produrrebbe percentuali errate quando qualcuno era protetto |
