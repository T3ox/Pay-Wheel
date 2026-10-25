# Backup e ripristino Firestore

## Configurazione produzione

Creare un bucket nella stessa area del database, abilitare un export Firestore giornaliero e una lifecycle rule che elimini gli export dopo 7 giorni. L’account del job deve avere soltanto i ruoli necessari per export e scrittura nel bucket.

## Ripristino

1. Bloccare temporaneamente le mutazioni dell’app.
2. Annotare project ID, timestamp dell’incidente e ultimo export valido.
3. Eseguire prima l’import in un progetto di verifica isolato.
4. Controllare gruppi, membership, outing, pagamenti e weekly summary su un campione noto.
5. Importare nel progetto target soltanto dopo l’approvazione del responsabile pilot.
6. Eseguire la quickstart e riabilitare le mutazioni.

Non sovrascrivere un database attivo senza un export aggiuntivo immediatamente precedente. La schedulazione e una prova di restore restano attività di infrastruttura da completare sul progetto Firebase reale.
