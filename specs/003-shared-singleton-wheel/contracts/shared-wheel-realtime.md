# Contract: Stato realtime condiviso

## Sorgenti osservate

```text
users/{uid}
groups/{INTERNAL_GROUP_ID}
groups/{INTERNAL_GROUP_ID}/outings/{openOutingId}
groups/{INTERNAL_GROUP_ID}/outings/{openOutingId}/participants/*
groups/{INTERNAL_GROUP_ID}/memberships/*
groups/{INTERNAL_GROUP_ID}/payments/*
```

Il documento workspace determina quale ruota osservare. Quando `openOutingId` cambia, il client rimuove i listener della ruota precedente prima di sottoscrivere quella nuova.

## Regole client

- La memoria React e la cache persistente sono repliche, non autorità.
- Uno snapshot con revisione inferiore a quella già applicata viene ignorato.
- Le azioni condivise sono disabilitate finché non è stato ricevuto il primo snapshot autoritativo.
- Lo stato `drawn` e il payer provengono esclusivamente dal documento ruota.
- Dopo riconnessione prevale sempre lo snapshot server più recente.

## Security Rules

- Solo utenti autenticati con `workspaceId` corrispondente e membership `active` possono leggere.
- Nessun client può scrivere direttamente workspace, ruota, partecipanti, pagamenti o riepiloghi.
- Tutte le scritture passano dalle callable.

## Coerenza osservabile

Una mutazione è completata quando la callable conferma il commit. I client convergono tramite listener; un client può applicare temporaneamente la risposta per feedback immediato, ma deve riconciliarla con la revisione Firestore.
