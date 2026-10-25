# Feature Specification: Colori ruota e dashboard amministrativa

**Feature Branch**: `002-wheel-admin-analytics`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Migliorare i colori degli spicchi della ruota, eliminando la resa anomala `fill: url(#protectedPattern)`, e aggiungere una dashboard amministrativa privata per monitorare spese e percentuali di uscita di tutte le persone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Distinguere tutti gli spicchi della ruota (Priority: P1)

Come partecipante voglio vedere ogni spicchio con un colore pieno, leggibile e coerente con la persona associata, così da capire immediatamente chi è presente anche quando alcuni partecipanti sono protetti.

**Why this priority**: La ruota è la superficie principale dell'app; uno spicchio reso come riferimento tecnico o con una trama dominante compromette la comprensione del flusso essenziale.

**Independent Test**: Aprire una ruota contenente partecipanti eleggibili e protetti e verificare che ogni spicchio mostri un colore valido, distinguibile e stabile, senza testo tecnico o riempimenti mancanti.

**Acceptance Scenarios**:

1. **Given** una ruota con partecipanti eleggibili, **When** la ruota viene mostrata, **Then** ogni persona ha un colore pieno stabile e distinguibile dagli spicchi adiacenti.
2. **Given** una persona protetta nella settimana, **When** il suo spicchio viene mostrato, **Then** conserva il proprio colore e comunica la protezione anche con un indicatore aggiuntivo non basato soltanto sul colore.
3. **Given** più persone del numero di colori base, **When** la palette viene riutilizzata, **Then** gli spicchi adiacenti restano distinguibili e i nomi o l'alternativa testuale permettono sempre di identificarli.
4. **Given** un browser o una modalità di rendering che non supporta un effetto decorativo, **When** la ruota viene caricata, **Then** lo spicchio mantiene un colore di fallback valido e non mostra riferimenti tecnici all'utente.

---

### User Story 2 - Consultare la dashboard amministrativa privata (Priority: P1)

Come amministratore voglio accedere a una sezione privata che riepiloga quanto è stato speso da ciascuna persona e con quale frequenza è stata estratta, così da controllare l'andamento economico e l'equità della ruota.

**Why this priority**: La dashboard fornisce la visibilità gestionale richiesta senza esporre dati economici aggregati agli utenti non autorizzati.

**Independent Test**: Accedere come amministratore, selezionare un periodo e confrontare totali e percentuali della dashboard con un insieme noto di uscite concluse.

**Acceptance Scenarios**:

1. **Given** un amministratore autenticato, **When** apre la navigazione secondaria, **Then** vede e può aprire la voce `Dashboard admin`.
2. **Given** una persona con uscite concluse nel periodo selezionato, **When** la dashboard viene caricata, **Then** mostra totale speso, numero di volte estratta, numero di partecipazioni e percentuale di estrazione nel periodo.
3. **Given** un periodo con più persone, **When** vengono mostrati i dati, **Then** ogni percentuale di estrazione è calcolata come estrazioni della persona divise per le sue partecipazioni eleggibili, mentre la dashboard mostra separatamente la quota sul totale delle uscite concluse.
4. **Given** un amministratore che cambia periodo, **When** seleziona settimana corrente, una settimana precedente o tutto lo storico, **Then** riepilogo e righe personali si aggiornano usando lo stesso intervallo.
5. **Given** un periodo senza uscite concluse, **When** viene aperto, **Then** la dashboard mostra uno stato vuoto chiaro e valori pari a zero senza percentuali fuorvianti.

---

### User Story 3 - Impedire l'accesso ai dati amministrativi (Priority: P1)

Come membro non amministratore voglio che i dati gestionali privati non siano disponibili nel client o tramite accessi diretti, così che spese aggregate e statistiche individuali restino riservate agli amministratori.

**Why this priority**: Nascondere soltanto una voce di menu non garantisce la riservatezza; l'autorizzazione deve valere per navigazione e lettura dei dati.

**Independent Test**: Tentare l'accesso con un membro autenticato, tramite menu, indirizzo diretto e richiesta dati, e verificare che nessun dato amministrativo venga restituito.

**Acceptance Scenarios**:

1. **Given** un membro non amministratore, **When** apre la navigazione secondaria, **Then** la voce della dashboard non è visibile.
2. **Given** un membro non amministratore, **When** prova ad aprire direttamente l'indirizzo della dashboard, **Then** viene reindirizzato a una sezione consentita senza vedere dati parziali.
3. **Given** un'identità priva di privilegio amministrativo, **When** richiede i dati aggregati della dashboard, **Then** la richiesta viene rifiutata e non restituisce importi o statistiche personali.
4. **Given** un privilegio amministrativo revocato durante una sessione, **When** l'utente aggiorna o riapre la dashboard, **Then** perde l'accesso senza usare dati memorizzati come se fossero correnti.

### Edge Cases

- Le persone rinominate o eliminate devono restare riconoscibili nello storico tramite il nome registrato al momento dell'uscita o un'etichetta anonimizzata.
- Le correzioni di un pagamento automatico devono sostituire l'importo precedente, non essere sommate come una seconda spesa.
- Le uscite annullate, aperte o senza pagamento concluso non devono alterare totali e percentuali.
- Una persona protetta con probabilità corrente pari a zero deve restare visibile nella ruota e nella dashboard senza essere contata come partecipazione eleggibile nel denominatore dell'equità.
- In presenza di dati incompleti, la dashboard deve distinguere `dato non disponibile` da un valore reale pari a zero.
- Importi e percentuali devono essere leggibili su viewport da 320 px, con zoom al 200% e tecnologie assistive.
- La palette deve mantenere contrasto sufficiente tra etichette, spicchi, bordo e indicatori di protezione anche in modalità ad alto contrasto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ogni partecipante MUST avere un colore di spicchio deterministico e stabile all'interno della stessa uscita.
- **FR-002**: Ogni spicchio MUST avere un colore di fallback valido anche quando un effetto decorativo non può essere mostrato.
- **FR-003**: Lo stato protetto MUST conservare il colore associato alla persona e MUST usare almeno un secondo indicatore percepibile senza affidarsi soltanto al colore.
- **FR-004**: La ruota MUST NOT mostrare all'utente stringhe tecniche, riferimenti a risorse grafiche o spicchi senza riempimento.
- **FR-005**: La scelta della palette MUST mantenere distinguibili gli spicchi adiacenti e garantire testo leggibile secondo i requisiti di contrasto applicabili.
- **FR-006**: La legenda o alternativa testuale della ruota MUST associare nome, colore, stato di protezione e percentuale corrente di ciascun partecipante.
- **FR-007**: Il sistema MUST esporre una sezione `Dashboard admin` soltanto agli utenti con accesso amministrativo attivo.
- **FR-008**: La dashboard MUST mostrare per il periodo selezionato il totale complessivo speso, il numero di uscite concluse e il numero di persone incluse.
- **FR-009**: La dashboard MUST mostrare per ogni persona almeno nome, totale speso, conteggio estrazioni, partecipazioni eleggibili, percentuale di estrazione sulle partecipazioni eleggibili e quota sul totale delle uscite concluse.
- **FR-010**: La percentuale di estrazione individuale MUST essere calcolata come `estrazioni / partecipazioni eleggibili × 100`; quando il denominatore è zero MUST essere mostrata come non disponibile.
- **FR-011**: La quota sul totale delle uscite MUST essere calcolata come `estrazioni / uscite concluse nel periodo × 100`; la somma delle quote delle persone MUST risultare pari al 100%, salvo arrotondamenti di visualizzazione.
- **FR-012**: La dashboard MUST consentire almeno i periodi settimana corrente, ciascuna settimana storica disponibile e tutto lo storico.
- **FR-013**: Totali e percentuali MUST includere soltanto uscite concluse e pagamenti effettivi; una correzione MUST sostituire l'importo originario.
- **FR-014**: Membri non amministratori e utenti anonimi MUST NOT poter ottenere dati della dashboard tramite menu, navigazione diretta o richiesta dati.
- **FR-015**: La verifica del privilegio amministrativo MUST avvenire sulla fonte autoritativa a ogni nuova richiesta di dati privati.
- **FR-016**: La revoca del privilegio MUST impedire nuovi accessi e aggiornamenti della dashboard senza richiedere una nuova installazione dell'app.
- **FR-017**: La dashboard MUST offrire ordinamento per nome, totale speso e percentuale di estrazione.
- **FR-018**: Tutti i valori monetari MUST essere presentati in EUR con due decimali e tutte le percentuali con una precisione coerente e dichiarata.
- **FR-019**: La ruota e la dashboard MUST essere utilizzabili con tastiera, screen reader, zoom al 200%, viewport da 320 px e preferenze di movimento ridotto.
- **FR-020**: I calcoli della dashboard MUST produrre lo stesso risultato a parità di uscite, partecipazioni, protezioni e correzioni, indipendentemente dal dispositivo usato per consultarli.

### Key Entities

- **Partecipante alla ruota**: persona presente in un'uscita, con identità, colore stabile, stato di eleggibilità e probabilità corrente.
- **Uscita conclusa**: estrazione terminata con persona selezionata, insieme dei partecipanti, eleggibilità registrata e pagamento effettivo.
- **Pagamento effettivo**: importo finale attribuito alla persona selezionata, inclusa l'eventuale correzione che sostituisce il valore automatico.
- **Riepilogo amministrativo del periodo**: aggregato privato con totale speso, numero di uscite e statistiche per persona su un intervallo selezionato.
- **Accesso amministrativo**: autorizzazione revocabile che abilita la consultazione dei dati gestionali senza modificare le normali regole di partecipazione.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nel 100% degli stati della ruota, inclusi quelli con persone protette, ogni spicchio presenta un riempimento visibile e nessuna stringa tecnica viene mostrata nell'interfaccia.
- **SC-002**: In test visivi e di accessibilità, nomi e stati di tutti i partecipanti restano identificabili senza dipendere esclusivamente dal colore.
- **SC-003**: Un amministratore raggiunge la dashboard e identifica totale speso, persona con maggiore spesa e percentuali di uscita in meno di 30 secondi.
- **SC-004**: Su un insieme di dati noto, il 100% dei totali monetari e delle percentuali visualizzati coincide con il calcolo atteso, entro il solo arrotondamento dichiarato.
- **SC-005**: Il 100% dei tentativi di accesso alla dashboard da parte di utenti anonimi o membri non amministratori non espone alcun dato amministrativo.
- **SC-006**: Il cambio di periodo aggiorna tutti i riepiloghi visibili in meno di 2 secondi per almeno 2.000 uscite storiche e 200 persone.
- **SC-007**: Ruota e dashboard superano i controlli di tastiera, screen reader, zoom 200%, viewport 320 px e contrasto previsti per i flussi principali.

## Assumptions

- `Percentuale di uscita` indica sia il tasso personale sulle partecipazioni eleggibili sia, separatamente, la quota della persona sul totale delle uscite concluse nel periodo.
- La dashboard è in sola lettura; correzione pagamenti e gestione account restano nei flussi già esistenti.
- La settimana usa il fuso orario e il confine settimanale già definiti dal prodotto.
- Gli amministratori possono consultare dati di tutte le persone del singolo workspace interno, incluse persone non più attive quando presenti nello storico.
- La prima versione non prevede esportazione, grafici predittivi o confronto con obiettivi di spesa.

## Dependencies

- Storico affidabile delle uscite concluse, dei partecipanti e dell'eleggibilità al momento dell'estrazione.
- Importo finale dei pagamenti e relative correzioni.
- Stato aggiornato dell'accesso amministrativo.

## Out of Scope

- Modifica dell'algoritmo che decide chi paga o dei pesi di equità.
- Modifica o cancellazione dei pagamenti dalla nuova dashboard.
- Esportazioni CSV/PDF, budget personali, notifiche o report programmati.
- Accesso della dashboard a membri non amministratori.
