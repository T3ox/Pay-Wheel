# Contract: Callable della ruota condivisa

Tutte le callable richiedono una sessione Firebase valida e una membership attiva nel workspace interno. Il client non invia il workspace ID.

## `bootstrapInternalSession`

Input:

```json
{ "requestId": "uuid" }
```

Output include `workspace`, `membership`, `currentOutingId` e `stateRevision`. Crea idempotentemente workspace, utente e membership.

## `joinCurrentOuting`

Input:

```json
{ "requestId": "uuid", "participating": true }
```

Output:

```json
{
  "outingId": "string|null",
  "status": "open|none",
  "participating": true,
  "participantCount": 3,
  "revision": 4,
  "stateRevision": 8,
  "created": false
}
```

Il primo join crea la ruota; join ripetuti per lo stesso uid non duplicano il partecipante. Leave su partecipante assente è idempotente.

## `previewOuting`

Input:

```json
{ "outingId": "string" }
```

Output include entries, `previewVersion`, `participantCount`, `revision` e metadati fairness. La preview non decide il pagante.

## `spinOuting`

Input:

```json
{
  "requestId": "uuid",
  "outingId": "string",
  "expectedPreviewVersion": "sha256:...",
  "expectedRevision": 4
}
```

Output include payer, entries, `drawnAt`, `revision` e `replayed`. Se la ruota o la preview sono cambiate restituisce `PREVIEW_STALE` con lo stato ricalcolato. Se il risultato esiste già, restituisce quello persistito con `replayed=true`.

## Errori condivisi

| Codice | Significato |
|---|---|
| `UNAUTHENTICATED` | sessione assente |
| `NOT_GROUP_MEMBER` | membership assente o disabilitata |
| `WORKSPACE_NOT_ACTIVE` | singleton non disponibile |
| `OUTING_NOT_OPEN` | join/leave non più ammesso |
| `NOT_ENOUGH_PARTICIPANTS` | meno di due partecipanti allo spin |
| `PREVIEW_STALE` | revisione o preview obsoleta |
| `WORKSPACE_LIMIT` | limite partecipanti raggiunto |
