# Contract: callable per workspace interno

Tutte le callable produzione richiedono Firebase Authentication e App Check. Il backend ricava il workspace da `INTERNAL_GROUP_ID`; il client non invia mai `groupId`. Ogni mutazione usa `requestId` UUID v4 e garantisce replay idempotente.

La modalità test non usa questi contratti: l'adapter locale implementa la stessa interfaccia applicativa in memoria/localStorage.

## Common errors

```json
{
  "code": "INTERNAL_ACCESS_DENIED",
  "message": "Questo account non può accedere all'app.",
  "retryable": false,
  "details": {}
}
```

Codici: `UNAUTHENTICATED`, `APP_CHECK_REQUIRED`, `INTERNAL_ACCESS_DENIED`, `ACCOUNT_DISABLED`, `INVALID_ARGUMENT`, `CONFLICT`, `NOT_FOUND`, `RATE_LIMITED`, `PREVIEW_STALE`, `INTERNAL_RETRYABLE`.

## Session bootstrap

### `bootstrapInternalSession`

Request:

```json
{ "requestId": "uuid" }
```

Response:

```json
{
  "user": { "userId": "user_123", "displayName": "Giulia", "photoUrl": null },
  "workspace": {
    "status": "active",
    "timezone": "Europe/Rome",
    "currency": "EUR"
  },
  "membership": { "status": "active", "access": "member" },
  "currentOutingId": "outing_123"
}
```

Invarianti:

- `auth.token.email_verified` deve essere true;
- il dominio email deve appartenere ad `INTERNAL_ALLOWED_DOMAINS`;
- user e membership vengono creati o aggiornati idempotentemente;
- nessun gruppo viene creato e nessun invito viene consumato;
- account disabilitati non vengono riattivati automaticamente.

## Outing lifecycle

### `joinCurrentOuting`

Request:

```json
{ "requestId": "uuid", "participating": true }
```

Response:

```json
{
  "outingId": "outing_123",
  "status": "open",
  "participating": true,
  "participantCount": 4,
  "created": false
}
```

Se non esiste un'uscita non terminale e `participating` è true, la callable la crea e iscrive il caller nella stessa transazione logica. Se il caller è già presente, restituisce lo stato corrente. `participating: false` è ammesso solo prima del draw. Ogni modifica invalida la preview.

### `previewOuting`

```json
{ "outingId": "outing_123" }
```

```json
{
  "outingId": "outing_123",
  "previewVersion": "sha256:75c4...",
  "algorithmVersion": "fairness-v1",
  "cooldownOverrideApplied": false,
  "entries": [
    {
      "userId": "user_456",
      "displayName": "Giulia",
      "colorKey": 2,
      "eligibility": "eligible",
      "weeklyTotalCents": 430,
      "probabilityMicros": 420000
    }
  ]
}
```

Richiede membership attiva. La somma delle probabilità è 1.000.000. La preview non sceglie un pagante.

### `spinOuting`

```json
{
  "requestId": "uuid",
  "outingId": "outing_123",
  "expectedPreviewVersion": "sha256:75c4..."
}
```

```json
{
  "outingId": "outing_123",
  "status": "drawn",
  "payer": { "userId": "user_456", "displayName": "Giulia", "colorKey": 2 },
  "previewVersion": "sha256:75c4...",
  "drawnAt": "2026-10-24T09:30:00Z",
  "replayed": false
}
```

Garanzie: caller partecipante, almeno due partecipanti, preview corrente, un solo risultato definitivo. `PREVIEW_STALE` restituisce la nuova preview nei details senza estrarre.

### `confirmPayment`

```json
{ "requestId": "uuid", "outingId": "outing_123", "amountCents": 840 }
```

```json
{
  "outingId": "outing_123",
  "paymentId": "outing_123",
  "status": "completed",
  "amountCents": 840,
  "currency": "EUR",
  "weekId": "2026-10-19"
}
```

Solo il payer. Importo intero positivo entro il limite. Pagamento, protezione e summary sono aggiornati una sola volta.

### `correctAutomaticPayment`

```json
{
  "requestId": "uuid",
  "outingId": "outing_123",
  "amountCents": 840,
  "reason": "Totale reale"
}
```

Autorizzati: payer oppure utente con custom claim `payWheelAdmin=true`. Non esiste più l'autorizzazione basata su owner del gruppo.

### `cancelOuting`

```json
{ "requestId": "uuid", "outingId": "outing_123", "reason": "Il bar era chiuso" }
```

Le regole di stato restano invariate; il backend usa implicitamente lo spazio interno.

## Removed contracts

Le seguenti callable non fanno parte del nuovo prodotto e devono essere prima rimosse dal client, poi disabilitate e infine eliminate dal deploy:

- `createGroup`
- `joinGroup`
- `createInvite`
- `revokeInvite`
- `removeMember`
- `transferOwnership`
- `archiveGroup`
- `leaveGroup`

Qualunque richiesta a un endpoint disabilitato restituisce `FUNCTION_REMOVED` senza modificare dati.

## Authorization matrix

| Operation                 |  Active member | Participant | Payer |        Admin claim |
| ------------------------- | -------------: | ----------: | ----: | -----------------: |
| Bootstrap                 | auto-provision |         n/a |   n/a |                yes |
| Join/leave outing         |            yes |         yes |   yes |                yes |
| Preview                   |            yes |         yes |   yes |                yes |
| Spin                      |             no |         yes |   yes | yes if participant |
| Confirm payment           |             no |          no |   yes |                 no |
| Correct automatic payment |             no |          no |   yes |                yes |
| Manage groups/invites     |             no |          no |    no |                 no |
