# Data Model: workspace interno singolo

**Storage production**: Cloud Firestore  
**Storage test**: localStorage isolato e versionato  
**Money**: centesimi interi  
**Time authority**: timestamp server UTC; `Europe/Rome` per i confini settimanali

## Collection Map

```text
users/{userId}
groups/{INTERNAL_GROUP_ID}                       # workspace interno, path compatibile
groups/{INTERNAL_GROUP_ID}/memberships/{userId}
groups/{INTERNAL_GROUP_ID}/outings/{outingId}
groups/{INTERNAL_GROUP_ID}/outings/{outingId}/participants/{userId}
groups/{INTERNAL_GROUP_ID}/payments/{paymentId}
groups/{INTERNAL_GROUP_ID}/payments/{paymentId}/corrections/{correctionId}
groups/{INTERNAL_GROUP_ID}/weeklySummaries/{weekId}
groups/{INTERNAL_GROUP_ID}/idempotencyKeys/{requestId}
```

Non vengono più creati `invites`, nuovi gruppi o associazioni selezionabili. Il nome `groups` resta soltanto per compatibilità dati.

## Entity: User

Path: `users/{userId}`; in produzione l'ID coincide con Firebase Auth UID.

| Field         | Type                                       | Required | Meaning                                          |
| ------------- | ------------------------------------------ | -------: | ------------------------------------------------ |
| `displayName` | string                                     |      yes | 1–80 caratteri                                   |
| `email`       | string                                     |     prod | lowercase, visibile solo all'utente e al backend |
| `photoUrl`    | string/null                                |      yes | avatar provider o null                           |
| `workspaceId` | string                                     |      yes | sempre `INTERNAL_GROUP_ID`, non selezionabile    |
| `status`      | `active/disabled/deletion_pending/deleted` |      yes | accesso interno                                  |
| `createdAt`   | timestamp                                  |      yes | server timestamp                                 |
| `updatedAt`   | timestamp                                  |      yes | server timestamp                                 |

### Rules

- `bootstrapInternalSession` crea o aggiorna il documento solo dopo validazione del dominio aziendale.
- Il client non modifica `workspaceId` o `status`.
- `activeGroupId` può essere letto durante la migrazione ma non è più una scelta di prodotto.

## Entity: InternalWorkspace

Path fisico: `groups/{INTERNAL_GROUP_ID}`.

| Field                     | Type                 | Required | Meaning                       |
| ------------------------- | -------------------- | -------: | ----------------------------- |
| `mode`                    | `internal_singleton` |      yes | impedisce uso multi-gruppo    |
| `currency`                | `EUR`                |      yes | valuta unica                  |
| `timezone`                | `Europe/Rome`        |      yes | confine settimanale           |
| `status`                  | `active/maintenance` |      yes | maintenance blocca mutazioni  |
| `openOutingId`            | string/null          |      yes | una sola uscita non terminale |
| `completedOutingSequence` | integer              |      yes | progressivo audit             |
| `algorithmVersion`        | string               |      yes | `fairness-v1`                 |
| `maxPaymentCents`         | integer              |      yes | default 50000                 |
| `createdAt`               | timestamp            |      yes | server timestamp              |
| `updatedAt`               | timestamp            |      yes | server timestamp              |

I campi legacy `name`, `ownerUserId` e `archivedAt` non sono consumati dal nuovo client. Possono restare durante il periodo di rollback.

## Entity: Membership

Path: `groups/{INTERNAL_GROUP_ID}/memberships/{userId}`.

| Field                 | Type                         | Required | Meaning                                                 |
| --------------------- | ---------------------------- | -------: | ------------------------------------------------------- |
| `userId`              | string                       |      yes | uguale all'ID documento                                 |
| `displayNameSnapshot` | string                       |      yes | nome corrente                                           |
| `photoUrlSnapshot`    | string/null                  |      yes | avatar corrente                                         |
| `access`              | `member/admin`               |      yes | `admin` deriva da custom claim, non da owner del gruppo |
| `status`              | `active/disabled/anonymized` |      yes | solo active partecipa                                   |
| `joinedAt`            | timestamp                    |      yes | primo bootstrap                                         |
| `lastSeenAt`          | timestamp                    |      yes | ultimo bootstrap riuscito                               |
| `lastPaidWeekId`      | string/null                  |      yes | protezione settimanale                                  |
| `lastPaidAt`          | timestamp/null               |      yes | tie-break e UI                                          |

La membership è creata automaticamente. Non esistono join tramite codice, leave group o trasferimento proprietà.

## Entity: Outing

Path: `groups/{INTERNAL_GROUP_ID}/outings/{outingId}`.

| Field                      | Type                             | Required | Meaning                                 |
| -------------------------- | -------------------------------- | -------: | --------------------------------------- |
| `createdBy`                | string                           |      yes | utente che ha aperto/joinato per primo  |
| `status`                   | `open/drawn/completed/cancelled` |      yes | lifecycle                               |
| `participantCount`         | integer                          |      yes | 0–25                                    |
| `previewVersion`           | string/null                      |      yes | hash dell'anteprima corrente            |
| `createdAt`                | timestamp                        |      yes | server timestamp                        |
| `drawnAt`                  | timestamp/null                   |      yes | risultato persistito                    |
| `completedAt`              | timestamp/null                   |      yes | pagamento persistito                    |
| `payerUserId`              | string/null                      |      yes | scelto dal backend                      |
| `payerDisplayNameSnapshot` | string/null                      |      yes | stabile nello storico                   |
| `paymentId`                | string/null                      |      yes | uguale a outingId                       |
| `fairnessSnapshot`         | map/null                         |      yes | algoritmo, probabilità e valore casuale |

### State transitions

```text
none ──joinCurrentOuting──> open ──spin──> drawn ──payment──> completed
                              └──────────── cancel ─────────> cancelled
```

`joinCurrentOuting` crea l'uscita se manca e iscrive il caller nella stessa operazione logica.

## Entity: Participant

Path: `groups/{INTERNAL_GROUP_ID}/outings/{outingId}/participants/{userId}`.

| Field                     | Type         | Required | Meaning                                           |
| ------------------------- | ------------ | -------: | ------------------------------------------------- |
| `userId`                  | string       |      yes | ID stabile                                        |
| `displayNameSnapshot`     | string       |      yes | 1–80 caratteri                                    |
| `photoUrlSnapshot`        | string/null  |      yes | opzionale                                         |
| `colorKey`                | integer      |      yes | indice palette stabile, non significato semantico |
| `joinedAt`                | timestamp    |      yes | ordinamento                                       |
| `eligibilityAtDraw`       | enum/null    |      yes | `eligible/protected/override`                     |
| `weeklyTotalCentsAtDraw`  | integer/null |      yes | snapshot                                          |
| `probabilityMicrosAtDraw` | integer/null |      yes | 0–1.000.000                                       |

## Payment, correction and weekly summary

Restano invariati rispetto al dominio esistente:

- `Payment` usa `outingId` come ID, importo intero, `source` manual/automatic e partecipanti congelati.
- `PaymentCorrection` conserva importo precedente, nuovo importo, motivo, autore e request ID.
- `WeeklySummary` conserva totali, media e statistiche dei soli partecipanti attivi della settimana.
- La correzione è concessa al payer o a un utente con custom claim `payWheelAdmin=true`; non esiste più l'owner del gruppo.

## Local Test State

Keys:

```text
pay-wheel:test-session:v2
pay-wheel:test-workspace:v2
```

```ts
interface LocalTestSession {
  actorId: string;
  displayName: string;
  enteredAt: string;
}

interface LocalTestWorkspace {
  schemaVersion: 2;
  outing: Outing | null;
  members: Membership[];
  payments: Payment[];
}
```

- `actorId` è generato una volta per browser.
- Nessun dato test viene migrato in produzione.
- Un cambio di `schemaVersion` invalida soltanto le chiavi `pay-wheel:test-*`.
- Il reset test deve essere un comando sviluppatore, non una CTA nella schermata iniziale.

## Removed entities and fields

- `Invite`: rimosso.
- Group creation/archive/ownership: rimosso dai contratti utente.
- `User.activeGroupId`: deprecato a favore di workspace fisso.
- Membership `role: owner/member`: migrato a `access: member/admin` oppure interpretato in compatibilità fino alla migrazione.
- Codici invito e deep link invito: rimossi.

## Invariants

1. Il backend opera sempre e soltanto su `INTERNAL_GROUP_ID`.
2. Un utente produzione attivo ha al massimo una membership, nello spazio interno.
3. `joinCurrentOuting` è idempotente e non duplica il partecipante.
4. Esiste al massimo una uscita non terminale.
5. Un'uscita ha al massimo un pagamento.
6. La somma delle probabilità congelate è 1.000.000.
7. Il payer appartiene agli eleggibili dello snapshot.
8. Test mode non legge né scrive Firestore.
9. La build production non può essere generata con `VITE_TEST_MODE=true`.

## Migration

1. Configurare l'ID dell'attuale gruppo aziendale come singleton.
2. Trasformare owner/member in access member/admin senza cambiare userId o storico.
3. Eseguire il nuovo client in lettura sullo stesso path e verificare summary/pagamenti.
4. Disabilitare callable di gruppo/invito.
5. Conservare documenti invito e gruppi non selezionati in sola lettura per il periodo di rollback.
6. Qualunque cancellazione fisica richiede una attività separata e un backup verificato.
