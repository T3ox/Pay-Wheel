# Contract: realtime e permessi del workspace interno

Il client produzione ascolta un solo workspace. Il valore `INTERNAL_GROUP_ID` è configurazione server/client coordinata, non un segreto e non una scelta utente.

## Required subscriptions

### Current user

Path: `users/{auth.uid}`.

Purpose: stato account e profilo. Read self-only; nessun cambio workspace dal client.

### Internal workspace

```text
groups/{INTERNAL_GROUP_ID}
groups/{INTERNAL_GROUP_ID}/memberships/* where status == active
```

Purpose: stato operativo e lista interna. Il nuovo client ignora nome gruppo, owner e inviti legacy.

### Current outing

```text
groups/{INTERNAL_GROUP_ID}/outings/{openOutingId}
groups/{INTERNAL_GROUP_ID}/outings/{outingId}/participants/*
```

Purpose: ruota, conteggio, preview e risultato. Ordering: `joinedAt`, poi `userId`.

### Weekly summary and history

```text
groups/{INTERNAL_GROUP_ID}/weeklySummaries/{weekId}
groups/{INTERNAL_GROUP_ID}/outings?status=completed|cancelled
groups/{INTERNAL_GROUP_ID}/payments?weekId={weekId}
```

Purpose: viste secondarie accessibili dal menu.

## UI consistency rules

- Il listener è la fonte durevole; la callable abilita feedback immediato.
- Nessun risultato, probabilità o totale produzione viene deciso dal client.
- Un errore `PREVIEW_STALE` aggiorna il dettaglio ma non avvia lo spin.
- Alla riapertura durante `drawn`, la UI mostra direttamente il risultato persistito.
- Join/leave può essere ottimistico, ma deve fare rollback su errore.
- Il menu secondario non blocca né ricrea le subscription.
- Test mode usa lo stesso shape applicativo ma nessuna subscription Firebase.

## Security rules intent

```text
default: deny read, deny write
user: self read
internal workspace: read iff active membership on INTERNAL_GROUP_ID
domain writes: functions/Admin SDK only
all other groups: deny to the new client
invites: deny
```

La Security Rule non deve affidarsi a un valore inviato liberamente dal client per scegliere il workspace. Il deploy sostituisce o genera l'ID consentito dalla configurazione ambiente.

## Mandatory rules tests

1. Utente anonimo non legge documenti.
2. Account autenticato ma fuori allowlist non riceve membership.
3. Membro attivo legge solo il workspace interno.
4. Un ID di altro gruppo non è leggibile anche se conosciuto.
5. Il client non scrive membership, payer, probabilità, pagamenti o summary.
6. Invites e relative query sono negate.
7. Account disabilitato perde letture e mutazioni.
8. Admin claim abilita solo le operazioni esplicitamente previste, non gestione gruppi.

## Loading, offline and errors

- Prima del primo click non appare loader testuale: la CTA è subito disponibile o resta disabilitata per il tempo minimo necessario all'idratazione.
- Dopo il click, loading resta nella stessa CTA.
- Errore login/accesso compare sotto la CTA e viene annunciato con `role=alert`.
- Offline in produzione: dati cache possono essere mostrati dopo una sessione nota, ma join/spin/payment sono disabilitati.
- In test mode offline non cambia comportamento perché tutto è locale.
- Update PWA non forza reload durante spin o pagamento.
