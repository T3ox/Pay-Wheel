# Osservabilità pilot

## Segnali

- Error rate e latenza p95 delle callable `previewOuting`, `spinOuting`, `confirmPayment` e `correctAutomaticPayment`.
- Fallimenti e durata dei job `autoSettlePayments` e `processAccountDeletions`.
- Outing in stato `drawn` da oltre 75 minuti.
- Richieste di cancellazione `pending` oltre la data pianificata.
- Letture/scritture Firestore e rifiuti App Check anomali.

## Alert consigliati

- callable error rate > 5% per 10 minuti;
- nessuna esecuzione riuscita del job automatico per 20 minuti;
- almeno un account deletion job fallito;
- consumo Firestore > 80% del budget giornaliero del pilot.

I log applicativi devono contenere solo ID tecnici, nome operazione, esito, durata e codice errore. Non registrare email, nomi, URL foto o importi. Dashboard e alert vanno creati nel progetto Google Cloud dell’ambiente prima del pilot.
