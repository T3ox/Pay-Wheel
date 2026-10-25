# Research: colori ruota e dashboard amministrativa

## Decision 1 — mantenere il colore del partecipante anche quando è protetto

**Decision**: ogni spicchio usa sempre un colore opaco associato al partecipante. La protezione viene rappresentata con un bordo interno tratteggiato ad alto contrasto e con testo nella lista accessibile.

**Rationale**: l'attuale `url(#protectedPattern)` sostituisce l'identità cromatica della persona e può diventare un riferimento non risolto o una resa poco comprensibile. Un overlay senza fill conserva identità, fallback e leggibilità.

**Alternatives considered**:

- Mantenere il pattern SVG ma assegnargli un ID univoco: risolve possibili collisioni ma continua a sostituire il colore del partecipante.
- Ridurre l'opacità dello spicchio: semplice, ma può abbassare il contrasto e usa ancora il colore come principale indicatore.
- Usare soltanto un'icona: utile come complemento, ma non sufficiente sugli spicchi piccoli o durante il movimento.

## Decision 2 — palette deterministica fino al limite di 25 partecipanti

**Decision**: usare una palette curata con variazioni controllate di tonalità e luminosità, ordinata per massimizzare la distanza tra vicini. Il colore dipende dalla posizione stabile del partecipante nell'uscita; il testo viene scelto nero o bianco in base alla luminanza relativa.

**Rationale**: la palette corrente ha otto colori e ricomincia dal primo, quindi a nove o più partecipanti può ripetere colori senza considerare l'adiacenza. Il limite noto di 25 consente una soluzione finita, testabile e senza dipendenze.

**Alternatives considered**:

- Colore derivato dall'hash globale dello user ID: stabile tra uscite ma può produrre collisioni o adiacenze poco distinguibili.
- Generazione casuale a ogni render: rompe la coerenza visiva e rende fragili test e animazione.
- Libreria esterna per palette: aggiunge una dipendenza per un problema limitato e deterministico.

## Decision 3 — metriche admin preaggregate per settimana

**Decision**: introdurre `groups/{workspaceId}/adminAnalytics/{weekId}`, aggiornato nella stessa transazione che conclude o corregge un pagamento. La vista all-time unisce i documenti settimanali lato server.

**Rationale**: la dashboard deve rispondere rapidamente fino a 2.000 uscite e richiede un denominatore basato sull'eleggibilità al draw. La scansione di outing, partecipanti e pagamenti a ogni apertura sarebbe più lenta, costosa e difficile da rendere consistente.

**Alternatives considered**:

- Calcolo client dai pagamenti: non è una barriera di sicurezza e non contiene sempre l'eleggibilità.
- Calcolo server on demand su tutte le uscite: corretto ma scala con lo storico e viola l'obiettivo di risposta.
- Estensione di `weeklySummaries`: riusa dati esistenti, ma quella collezione è leggibile dai membri e non modella esplicitamente le partecipazioni eleggibili.

## Decision 4 — callable autoritativa per lettura admin

**Decision**: esporre `getAdminAnalytics` come callable che verifica identità interna, membership attiva e accesso admin prima di leggere gli aggregati. Nessun client legge direttamente la collezione.

**Rationale**: la dashboard privata non può dipendere dalla sola presenza/assenza di un link. La callable riusa i controlli già presenti (`requireInternalMember`, `hasInternalAdminClaim`) e permette di gestire una revoca al momento della richiesta.

**Alternatives considered**:

- Security Rules con claim admin e lettura client: possibile, ma l'accesso può dipendere anche dal campo membership e richiederebbe query/client più complessi.
- Route guard soltanto client: nasconde l'interfaccia ma non protegge i dati.
- Incorporare tutto nel bootstrap: caricherebbe dati sensibili e potenzialmente voluminosi anche quando la dashboard non viene aperta.

## Decision 5 — due percentuali esplicite

**Decision**: mostrare `selectionRate` come estrazioni divise per partecipazioni eleggibili della persona e `outingShare` come estrazioni divise per tutte le uscite concluse del periodo.

**Rationale**: “percentuale di uscita” può indicare equità personale oppure quota assoluta. Presentare entrambe elimina l'ambiguità e aiuta a distinguere una persona spesso presente da una raramente presente.

**Alternatives considered**:

- Solo quota sul totale: penalizza visivamente chi partecipa poco e non misura l'equità individuale.
- Solo tasso personale: non consente di vedere come si distribuiscono tutte le uscite del periodo.
- Probabilità teorica corrente: descrive soltanto la prossima estrazione, non lo storico richiesto dalla dashboard.

## Decision 6 — basis points e importi interi

**Decision**: persistere conteggi e centesimi interi; calcolare le percentuali di risposta in basis points interi. La formattazione decimale avviene soltanto in UI.

**Rationale**: evita errori floating point, rende i test deterministici e mantiene la convenzione monetaria già usata dal progetto.

**Alternatives considered**:

- Percentuali floating point persistite: possono divergere dopo merge e correzioni.
- Stringhe percentuali generate dal server: mescolano dati e localizzazione, limitando ordinamento e test.

## Decision 7 — backfill idempotente prima dell'attivazione

**Decision**: ricostruire gli aggregati storici per settimana usando pagamenti finali, outing e fairness snapshot. Salvare versione, conteggio sorgenti e numero di record incompleti; una nuova esecuzione sostituisce il documento della settimana anziché incrementarlo.

**Rationale**: l'aggregato non esiste per lo storico e alcuni pagamenti non includono gli ID eleggibili. Un backfill ricostruibile evita doppio conteggio e rende espliciti i casi in cui il denominatore non è disponibile.

**Alternatives considered**:

- Dashboard solo dal giorno di rilascio: non soddisfa “tutto lo storico”.
- Assumere eleggibili tutti i partecipanti storici: falsifica il tasso quando erano presenti persone protette.
- Migrazione una tantum non versionata: difficile da verificare o ripetere in sicurezza.

## Resolved unknowns

- L'accesso admin usa il meccanismo esistente `payWheelAdmin`/`membership.access` e viene riverificato server-side.
- Il periodo predefinito è la settimana corrente; sono disponibili singole settimane e all-time.
- Correzioni di pagamento applicano un delta monetario senza modificare conteggi.
- Record storici incompleti producono metriche `null` e un indicatore di incompletezza, non zeri inventati.
- Non servono nuove dipendenze runtime per palette o grafici; la prima dashboard usa riepiloghi e tabella responsive.
