# Data Model: colori ruota e dashboard amministrativa

## 1. Wheel Segment View Model

Modello derivato in memoria, non persistito.

| Field | Type | Rules |
|-------|------|-------|
| `userId` | string | ID del partecipante, obbligatorio |
| `displayName` | string | snapshot mostrato nella ruota/lista |
| `fillColor` | hex color | sempre opaco e valido; fallback se lookup fallisce |
| `labelColor` | `#111318` \| `#FFFFFF` | scelto dalla luminanza del fill |
| `eligibility` | `eligible` \| `protected` \| `override` | deriva dalla preview autoritativa |
| `probabilityMicros` | integer | 0–1.000.000 |
| `protectedIndicator` | boolean | vero soltanto per `protected` |

### Validation rules

- `fillColor` non può essere `url(...)`, `none`, trasparente o vuoto.
- Due spicchi adiacenti non possono ricevere lo stesso `fillColor` per 1–25 partecipanti.
- `protectedIndicator` aggiunge un overlay senza sostituire `fillColor`.
- La lista semantica espone nome, stato e percentuale anche quando l'etichetta non entra nello spicchio.

## 2. Payment extension

Documento esistente: `groups/{workspaceId}/payments/{outingId}`.

### New fields

| Field | Type | Rules |
|-------|------|-------|
| `eligibleParticipantUserIdsAtDraw` | string[] | ID con peso maggiore di zero nel fairness snapshot |
| `analyticsAppliedVersion` | integer | `1` dopo aggiornamento atomico dell'aggregato |

### Existing fields used

- `outingId`, `payerUserId`, `payerDisplayNameSnapshot`
- `amountCents`, `weekId`, `source`, `correctedAt`
- `participantUserIdsAtDraw`, `participantCountAtDraw`, `createdAt`

### Validation rules

- Il payer deve apparire in `eligibleParticipantUserIdsAtDraw`.
- Gli eleggibili devono essere un sottoinsieme di `participantUserIdsAtDraw`.
- La correzione cambia `amountCents` ma non gli array di partecipazione.

## 3. Admin Weekly Analytics

Documento server-only: `groups/{workspaceId}/adminAnalytics/{weekId}`.

| Field | Type | Rules |
|-------|------|-------|
| `weekId` | date string | lunedì della settimana, coerente col timezone workspace |
| `currency` | `EUR` | costante |
| `aggregateVersion` | integer | versione schema/calcolo, inizialmente `1` |
| `completedOutingCount` | non-negative integer | numero pagamenti effettivi distinti |
| `totalSpentCents` | non-negative integer | somma importi finali |
| `sourcePaymentCount` | non-negative integer | pagamenti processati dal backfill/live path |
| `incompleteSourceCount` | non-negative integer | fonti prive del set eleggibile affidabile |
| `personStats` | map keyed by userId | statistiche individuali |
| `updatedAt` | timestamp | ultimo aggiornamento |
| `rebuiltAt` | timestamp \| null | valorizzato dal backfill |

### PersonAdminStat

| Field | Type | Rules |
|-------|------|-------|
| `userId` | string | uguale alla chiave della mappa |
| `displayNameSnapshot` | string | ultimo snapshot noto nel periodo |
| `spentCents` | non-negative integer | totale finale pagato dalla persona |
| `drawCount` | non-negative integer | volte in cui è stata selezionata |
| `eligibleParticipationCount` | non-negative integer \| null | partecipazioni con peso > 0; null se sorgente incompleta |
| `totalParticipationCount` | non-negative integer | tutte le partecipazioni al draw, incluse protette |
| `lastDrawnAt` | timestamp \| null | ultimo pagamento attribuito nel periodo |

### Invariants

- `completedOutingCount === sum(personStats[*].drawCount)`.
- `totalSpentCents === sum(personStats[*].spentCents)`.
- `sourcePaymentCount === completedOutingCount` quando il documento è completo.
- `eligibleParticipationCount <= totalParticipationCount` quando non è null.
- Correggere un pagamento cambia soltanto il totale e lo `spentCents` del payer del delta.
- Un replay con lo stesso `outingId` non modifica di nuovo l'aggregato.

## 4. Applied analytics event

Sotto-documento server-only opzionale per idempotenza: `groups/{workspaceId}/adminAnalytics/{weekId}/appliedOutings/{outingId}`.

| Field | Type | Rules |
|-------|------|-------|
| `outingId` | string | ID univoco evento |
| `payerUserId` | string | persona selezionata |
| `amountCents` | integer | importo attualmente applicato |
| `participantUserIds` | string[] | partecipanti totali |
| `eligibleParticipantUserIds` | string[] \| null | null per fonte storica incompleta |
| `appliedAt` | timestamp | prima applicazione |
| `updatedAt` | timestamp | ultima correzione |

### State transitions

```text
missing
  └── payment completed → applied
applied
  ├── same payment replay → unchanged
  └── corrected payment → applied with new amount + aggregate delta
```

L'evento consente transazioni idempotenti e verifica del backfill senza affidarsi al conteggio globale.

## 5. Admin Analytics Response

Modello non persistito restituito dalla callable.

| Field | Type | Rules |
|-------|------|-------|
| `period.kind` | `week` \| `all` | periodo richiesto |
| `period.weekId` | string \| null | richiesto per `week` |
| `availableWeekIds` | string[] | ordinate decrescenti |
| `completedOutingCount` | integer | merge del periodo |
| `totalSpentCents` | integer | merge del periodo |
| `personCount` | integer | righe incluse |
| `incompleteSourceCount` | integer | fonti incomplete nel periodo |
| `rows` | AdminAnalyticsRow[] | una riga per persona |
| `generatedAt` | ISO timestamp | momento risposta |

### AdminAnalyticsRow

| Field | Type | Formula |
|-------|------|---------|
| `userId` | string | chiave aggregata |
| `displayName` | string | ultimo snapshot disponibile |
| `spentCents` | integer | somma periodo |
| `drawCount` | integer | somma periodo |
| `eligibleParticipationCount` | integer \| null | somma, oppure null se almeno una fonte rilevante è incompleta |
| `totalParticipationCount` | integer | somma periodo |
| `selectionRateBps` | integer \| null | `round(drawCount × 10.000 / eligibleParticipationCount)` |
| `outingShareBps` | integer \| null | `round(drawCount × 10.000 / completedOutingCount)` |
| `lastDrawnAt` | ISO timestamp \| null | massimo del periodo |

## 6. Admin access state

Derivato da bootstrap e verificato nuovamente lato server.

| State | Menu/route | Callable |
|-------|------------|----------|
| anonymous | nascosti | `UNAUTHENTICATED` |
| active member | nascosti/reindirizzati | `PERMISSION_DENIED` |
| active admin | visibili | response consentita |
| disabled/revoked | rimossi al refresh; cache cancellata | `PERMISSION_DENIED` |

## 7. Backfill state

Il backfill ricostruisce una settimana in memoria e sostituisce in batch controllato il documento e gli eventi applicati.

| Field | Meaning |
|-------|---------|
| `aggregateVersion` | rende rilevabile un documento obsoleto |
| `sourcePaymentCount` | deve coincidere con i pagamenti validi letti |
| `incompleteSourceCount` | segnala outing senza fairness snapshot completo |
| `rebuiltAt` | distingue ricostruzione da aggiornamento live |

Il backfill è completo quando tutte le settimane con pagamenti hanno versione corrente e `sourcePaymentCount` atteso; non inventa eleggibilità per fonti incomplete.
