# Data Model: Ruota singleton condivisa

## Workspace singleton

Path: `groups/{INTERNAL_GROUP_ID}`

| Campo | Tipo | Vincolo | Scopo |
|---|---|---|---|
| `mode` | string | `internal_singleton` | identifica il workspace unico |
| `status` | string | `active` o `maintenance` | abilita o sospende le mutazioni |
| `openOutingId` | string/null | al massimo un valore | punta alla ruota autoritativa attiva |
| `stateRevision` | integer | >= 0, monotono | ordina le mutazioni condivise |
| `completedOutingSequence` | integer | >= 0 | ordina lo storico concluso |
| `algorithmVersion` | string | `fairness-v1` | versione delle regole di estrazione |
| `updatedAt` | timestamp | server-side | diagnosi e sincronizzazione |

Invariante: se `openOutingId` non è null, deve esistere esattamente una ruota non terminale con quell'ID. Nessun'altra ruota dello stesso workspace può essere `open`, `locked` o `drawn` in attesa di pagamento.

## Ruota condivisa

Path: `groups/{groupId}/outings/{outingId}`

| Campo | Tipo | Vincolo | Scopo |
|---|---|---|---|
| `status` | enum | `open`, `locked`, `drawn`, `completed`, `cancelled` | stato del ciclo |
| `revision` | integer | >= 1, monotono | versione della ruota |
| `createdBy` | uid | membro attivo | autore del primo join |
| `participantCount` | integer | 0..25 | conteggio corrente |
| `previewVersion` | string/null | hash della preview | controllo optimistic concurrency |
| `fairnessSnapshot` | object/null | immutabile dopo draw | input, pesi e casualità dell'estrazione |
| `payerUserId` | uid/null | partecipante eleggibile | risultato autoritativo |
| `payerDisplayNameSnapshot` | string/null | 1..80 | nome storico del pagante |
| `createdAt`, `lockedAt`, `drawnAt` | timestamp/null | server-side | lifecycle |

Transizioni consentite:

```text
open -> drawn -> completed
open -> cancelled
drawn -> cancelled (solo flusso amministrativo esistente)
```

Join e leave sono consentiti soltanto in `open`. Ogni mutazione incrementa `revision` e `stateRevision` nella stessa transazione.

## Partecipante

Path: `groups/{groupId}/outings/{outingId}/participants/{uid}`

| Campo | Tipo | Vincolo | Scopo |
|---|---|---|---|
| `userId` | uid | uguale all'ID documento | identità stabile |
| `displayNameSnapshot` | string | 1..80 | etichetta della ruota |
| `joinedAt` | timestamp | server-side | ordine deterministico |
| `joinedBy` | uid | membro attivo | audit |
| campi `*AtDraw` | valori/null | congelati allo spin | storico dell'equità |

La chiave uid rende join e retry idempotenti. Due persone con lo stesso nome rimangono distinte.

## Membership e utente

La membership esistente determina accesso, display name e protezione settimanale. Il documento `users/{uid}` associa ogni identità allo stesso `workspaceId`; il client non sceglie il group ID.

## Comando condiviso

Ogni mutazione contiene `requestId` UUID. La semantica idempotente esistente viene mantenuta; per join e spin la combinazione di chiave documento e transazione impedisce duplicati anche in caso di retry.

## Fairness snapshot e risultato

Lo snapshot contiene versione algoritmo, versione preview, settimana, media, entries, utenti eleggibili, limite casuale, valore casuale e selezionato. Viene scritto insieme a `status=drawn`; dopo tale transizione il risultato è immutabile e le richieste successive ricevono lo stesso pagante.
