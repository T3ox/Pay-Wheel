# Auth e dominio

## Configurazione richiesta

1. Registrare una Web App nel progetto Firebase e copiare i valori pubblici in `apps/web/.env.local`.
2. In Firebase Authentication abilitare Google come provider.
3. Aggiungere il dominio di Hosting e l’eventuale dominio personalizzato ai domini autorizzati.
4. Impostare `VITE_FIREBASE_AUTH_DOMAIN` sul dominio Auth previsto per l’ambiente.
5. Creare una chiave reCAPTCHA Enterprise e valorizzare `VITE_APP_CHECK_SITE_KEY` fuori dagli emulatori.

Il client usa popup su desktop e redirect su mobile/standalone. Prima del pilot verificare entrambi i flussi sul dominio reale, compreso Safari iOS. Nessun client secret deve essere incluso nelle variabili `VITE_*`.

## Verifica

- Il callback torna alla route richiesta prima del login.
- La sessione sopravvive a reload e avvio dalla Home screen.
- Auth, Functions e Firestore condividono lo stesso project ID.
- Le callable rifiutano richieste senza token Auth o App Check.

Stato locale: implementato; verifica dominio staging ancora richiesta.
