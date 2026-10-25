# Feature Specification: Ruota singleton condivisa in rete

**Feature Branch**: `003-shared-singleton-wheel`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Consentire a più utenti, inclusi utenti collegati da smartphone tramite l'indirizzo IP del computer host, di partecipare alla stessa ruota singleton e di vedere uno stato condiviso e coerente. Eliminare inoltre il blocco causato dall'indisponibilità di `crypto.randomUUID()` nei browser aperti tramite HTTP su IP locale.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Partecipare alla stessa ruota da più dispositivi (Priority: P1)

Come collega collegato dalla rete locale voglio entrare nella ruota dal mio telefono o computer e vedere gli stessi partecipanti degli altri utenti, così che il gruppo utilizzi una sola ruota comune invece di copie isolate per browser.

**Why this priority**: La condivisione dello stato è il valore centrale della funzionalità; senza una fonte comune ogni utente osserva una ruota diversa e il flusso di gruppo non è utilizzabile.

**Independent Test**: Aprire l'app sul computer host e su due telefoni collegati alla stessa rete, entrare con tre identità distinte e verificare che tutti i dispositivi mostrino la stessa ruota e lo stesso elenco dei partecipanti.

**Acceptance Scenarios**:

1. **Given** tre dispositivi collegati allo stesso ambiente condiviso, **When** ciascun utente seleziona `Aggiungimi`, **Then** tutti vedono gli stessi tre partecipanti nella medesima ruota attiva.
2. **Given** una ruota già aperta con partecipanti, **When** un nuovo dispositivo entra, **Then** riceve lo stato corrente completo senza creare una seconda ruota.
3. **Given** un partecipante già presente, **When** aggiorna la pagina o ripete l'ingresso dalla stessa sessione, **Then** non viene aggiunto un duplicato.
4. **Given** due utenti che entrano quasi contemporaneamente, **When** le richieste vengono elaborate, **Then** entrambi compaiono una sola volta e tutti i dispositivi convergono sullo stesso stato.

---

### User Story 2 - Osservare una sola estrazione condivisa (Priority: P1)

Come partecipante voglio che l'avvio della ruota produca un solo risultato autoritativo visibile a tutti, così che non esistano paganti diversi sui diversi dispositivi.

**Why this priority**: Un risultato divergente rende la ruota inaffidabile e può generare contestazioni sul pagamento.

**Independent Test**: Con almeno tre sessioni attive, avviare l'estrazione quasi contemporaneamente da due dispositivi e verificare che venga registrato un solo risultato e che tutti mostrino lo stesso pagante.

**Acceptance Scenarios**:

1. **Given** una ruota aperta e valida, **When** un partecipante avvia l'estrazione, **Then** tutti i dispositivi mostrano lo stesso stato di estrazione e lo stesso risultato definitivo.
2. **Given** due comandi di estrazione concorrenti, **When** arrivano prima della conclusione del primo, **Then** viene accettata una sola estrazione e il secondo comando recupera o conferma il risultato esistente senza crearne un altro.
3. **Given** un dispositivo che si collega dopo l'estrazione, **When** carica la ruota, **Then** vede il risultato definitivo già condiviso e non una nuova ruota aperta.
4. **Given** una variazione dei partecipanti durante la preparazione dell'estrazione, **When** il comando usa una versione non più corrente, **Then** l'estrazione non parte e tutti ricevono lo stato aggiornato.

---

### User Story 3 - Usare l'app da smartphone tramite IP locale (Priority: P1)

Come collega voglio aprire l'indirizzo IP locale dell'host dal telefono e completare ingresso, partecipazione ed estrazione senza errori legati alle funzionalità crittografiche opzionali del browser.

**Why this priority**: La generazione nativa degli identificatori può non essere disponibile quando la pagina viene aperta su un indirizzo HTTP della rete locale; l'errore interrompe il flusso prima che l'utente possa partecipare.

**Independent Test**: Aprire l'app da almeno un browser iOS e uno Android tramite `http://<ip-host>:<porta>`, simulando anche l'assenza della capacità nativa di generare UUID, e completare ingresso, join ed estrazione senza eccezioni.

**Acceptance Scenarios**:

1. **Given** un browser in cui la generazione nativa di UUID non è disponibile, **When** l'utente entra, **Then** il sistema genera comunque un identificatore valido e non mostra un errore tecnico.
2. **Given** l'app aperta tramite HTTP su IP locale, **When** l'utente esegue azioni che richiedono un identificatore di richiesta, **Then** tutte le azioni vengono inviate una sola volta con identificatori validi.
3. **Given** una sessione mobile già creata, **When** la pagina viene aggiornata, **Then** l'identità viene ripristinata e non appare un secondo partecipante.
4. **Given** un browser privo anche della strategia primaria alternativa, **When** serve un identificatore, **Then** viene usata una strategia di compatibilità con rischio di collisione trascurabile e il flusso prosegue.

---

### User Story 4 - Recuperare sincronizzazione e connessione (Priority: P2)

Come partecipante voglio capire quando il mio dispositivo non è sincronizzato e recuperare automaticamente lo stato corrente quando la connessione torna disponibile, così da non agire su una copia obsoleta della ruota.

**Why this priority**: Le reti Wi-Fi mobili possono interrompersi brevemente; il recupero protegge la coerenza dopo che il flusso condiviso di base è operativo.

**Independent Test**: Disconnettere un telefono durante un aggiornamento della ruota, modificare lo stato da un altro dispositivo, ripristinare la rete e verificare che il telefono converga automaticamente sullo stato autoritativo.

**Acceptance Scenarios**:

1. **Given** un dispositivo che perde la connessione, **When** tenta un'azione condivisa, **Then** l'azione non viene presentata come completata e l'utente vede uno stato di connessione comprensibile.
2. **Given** modifiche avvenute mentre un dispositivo era offline, **When** la connessione ritorna, **Then** il dispositivo sostituisce la copia obsoleta con lo stato autoritativo corrente.
3. **Given** una richiesta inviata ma senza risposta per perdita di rete, **When** viene ritentata, **Then** non crea duplicati di partecipazione, estrazione o pagamento.

### Edge Cases

- Due utenti scelgono lo stesso nome visualizzato: restano identità distinte e l'interfaccia offre un modo non ambiguo per distinguerli.
- Un utente apre più schede o finestre con la stessa sessione: viene rappresentato una sola volta e ogni scheda osserva lo stesso stato.
- L'host viene riavviato durante una ruota aperta: al ripristino viene recuperata la ruota autoritativa esistente oppure viene dichiarata esplicitamente l'impossibilità di recuperarla; non ne viene creata una concorrente in silenzio.
- L'ultimo partecipante si ritira: la ruota rimane aperta ma non estraibile finché non sono soddisfatte le regole minime di partecipazione.
- Un partecipante si ritira mentre un altro avvia l'estrazione: prevale una sola revisione autoritativa e un comando basato su dati obsoleti viene rifiutato senza risultato parziale.
- Un dispositivo riceve aggiornamenti fuori ordine o duplicati: applica solo lo stato autoritativo più recente.
- Due dispositivi generano casualmente lo stesso identificatore: il sistema rileva il conflitto e non associa un'azione o un'identità alla persona sbagliata.
- Il telefono non può raggiungere l'host per firewall, isolamento client Wi-Fi o indirizzo errato: l'app mostra un errore di connessione distinto dagli errori di ingresso e di estrazione.
- Il browser limita installazione PWA, autenticazione o altre capacità su HTTP: la partecipazione locale di base continua a funzionare oppure viene mostrata una spiegazione specifica della capacità non disponibile.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST mantenere una sola ruota attiva autoritativa per il workspace condiviso.
- **FR-002**: Ogni client MUST ottenere lo stato della ruota dalla fonte condivisa e MUST NOT considerare la propria memoria locale come fonte autoritativa.
- **FR-003**: Lo stato condiviso MUST includere almeno identificativo e fase della ruota, revisione corrente, partecipanti, anteprima valida, risultato dell'estrazione e informazioni necessarie a completare il pagamento.
- **FR-004**: Un nuovo client MUST ricevere uno snapshot completo dello stato corrente prima di poter eseguire azioni che lo modificano.
- **FR-005**: Ogni modifica accettata MUST essere propagata a tutti i client collegati alla stessa ruota.
- **FR-006**: Ogni partecipante MUST avere un'identità stabile per la durata della sessione e distinta dall'identità degli altri partecipanti, anche in presenza di nomi uguali.
- **FR-007**: L'ingresso, il ritiro e il rientro MUST essere idempotenti e MUST NOT creare partecipanti duplicati.
- **FR-008**: Il sistema MUST gestire in modo deterministico richieste concorrenti di apertura, ingresso, ritiro, estrazione e completamento.
- **FR-009**: Ogni stato condiviso MUST avere una revisione ordinabile; una modifica basata su una revisione obsoleta MUST essere rifiutata o riconciliata prima di essere mostrata come completata.
- **FR-010**: Una ruota MUST produrre al massimo un risultato definitivo.
- **FR-011**: Il risultato definitivo MUST essere persistito nella fonte autoritativa prima di essere comunicato come completato ai client.
- **FR-012**: Tutti i client, inclusi quelli collegati dopo l'estrazione, MUST mostrare lo stesso risultato definitivo.
- **FR-013**: La preparazione dell'estrazione MUST usare un insieme di partecipanti e probabilità riferito alla stessa revisione condivisa.
- **FR-014**: Il sistema MUST impedire una nuova estrazione finché la ruota precedente è ancora attiva o attende il completamento previsto dal suo ciclo di vita.
- **FR-015**: Il client MUST generare identificatori di sessione e di richiesta in tutti i browser target senza assumere la disponibilità di una singola funzionalità opzionale.
- **FR-016**: La strategia di compatibilità per gli identificatori MUST produrre valori validi, sufficientemente univoci per il carico previsto e non derivati da dati personali leggibili.
- **FR-017**: Tutti i punti dell'app che creano identificatori MUST usare la stessa capacità compatibile, inclusi ingresso locale, apertura ruota e richieste mutative.
- **FR-018**: Un browser mobile collegato tramite HTTP su IP locale MUST poter completare il flusso base senza eccezioni non gestite dovute al contesto non sicuro.
- **FR-019**: Un errore di compatibilità o connessione MUST essere convertito in un messaggio comprensibile e MUST NOT lasciare l'interfaccia in stato di caricamento permanente.
- **FR-020**: La perdita temporanea di rete MUST rendere evidente lo stato non sincronizzato e MUST impedire di confermare localmente azioni condivise non accettate.
- **FR-021**: Alla riconnessione il client MUST recuperare lo stato autoritativo corrente e scartare revisioni locali obsolete.
- **FR-022**: Il retry della stessa azione MUST conservare la stessa intenzione logica e MUST NOT duplicare partecipazioni, estrazioni o pagamenti.
- **FR-023**: La modalità condivisa MUST supportare almeno 20 partecipanti e 20 dispositivi contemporaneamente sulla stessa ruota.
- **FR-024**: La modalità demo esclusivamente locale MUST essere chiaramente distinta dalla modalità condivisa e MUST NOT far credere agli utenti che dati confinati a un browser siano visibili agli altri.
- **FR-025**: Il sistema MUST registrare gli eventi minimi necessari a diagnosticare connessioni, conflitti di revisione, retry ed estrazioni concorrenti senza includere dati personali non necessari.
- **FR-026**: I test di compatibilità MUST coprire l'assenza della generazione nativa di UUID, accesso tramite IP locale, aggiornamento pagina, richieste concorrenti e riconnessione.
- **FR-027**: Le regole esistenti di equità, protezione settimanale, pagamento e accessibilità MUST restare invariate salvo quanto necessario alla sincronizzazione condivisa.

### Key Entities

- **Workspace condiviso**: contesto singleton a cui appartengono tutti gli utenti autorizzati; espone una sola ruota attiva alla volta.
- **Ruota condivisa**: stato autoritativo del ciclo corrente, con fase, revisione, partecipanti, anteprima, risultato e riferimenti al completamento.
- **Sessione utente**: identità stabile del browser o dell'utente autenticato, usata per riconoscere rientri e schede multiple senza duplicare il partecipante.
- **Partecipante**: associa una sessione o identità utente alla ruota corrente, con nome visualizzato, stato di partecipazione e ordine di ingresso.
- **Comando condiviso**: intenzione idempotente di modificare la ruota, identificata univocamente e associata alla revisione osservata dal client.
- **Revisione di stato**: valore monotono che permette di ordinare gli aggiornamenti, rilevare copie obsolete e convergere sullo stato più recente.
- **Risultato di estrazione**: esito unico e definitivo associato alla ruota e alla revisione delle probabilità con cui è stato prodotto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In una prova con 20 dispositivi collegati, il 100% visualizza lo stesso insieme di partecipanti entro 2 secondi da ogni ingresso o ritiro accettato.
- **SC-002**: In 100 prove con due o più comandi di estrazione concorrenti, viene prodotto esattamente un risultato per prova e tutti i dispositivi mostrano lo stesso pagante.
- **SC-003**: Il 100% dei nuovi dispositivi collegati durante una ruota esistente riceve lo stato corrente senza creare una seconda ruota.
- **SC-004**: Su almeno un browser mobile iOS e uno Android aperti tramite IP locale, ingresso, partecipazione, estrazione e aggiornamento pagina completano senza errori anche quando la generazione nativa di UUID non è disponibile.
- **SC-005**: In 1.000 identificatori generati per ciascuna strategia supportata non si verifica alcuna collisione e tutti rispettano il formato accettato dal sistema.
- **SC-006**: Dopo un'interruzione di rete fino a 60 secondi, il 95% dei client torna allo stato autoritativo entro 3 secondi dal ripristino della connettività senza intervento manuale.
- **SC-007**: Retry, ricariche e aperture di schede multiple non producono duplicati in 100 esecuzioni automatizzate dei flussi di ingresso, estrazione e pagamento.
- **SC-008**: Il 100% degli errori di rete o compatibilità previsti mostra un messaggio comprensibile e lascia disponibile un'azione di recupero, senza schermate bloccate.
- **SC-009**: Tutti i test esistenti relativi a equità, protezione settimanale, pagamento e accessibilità continuano a superare senza variazioni dei risultati attesi.

## Assumptions

- Esiste un solo workspace aziendale e una sola ruota attiva per volta; non vengono introdotte stanze, codici invito o più gruppi.
- “Singleton” significa una sola fonte autoritativa condivisa tra tutti i dispositivi, non una singola istanza in memoria all'interno di ciascun browser.
- La prima versione è destinata a un gruppo piccolo sulla stessa rete locale, con un massimo previsto di 20 dispositivi simultanei.
- Gli utenti possono usare una sessione locale distinta in ambiente di sviluppo oppure l'identità aziendale già prevista in produzione; la sincronizzazione della ruota non dipende dal nome visualizzato.
- Lo stato del singolo browser può essere usato come cache e per ripristinare l'identità, ma non può decidere autonomamente partecipanti, revisione o risultato.
- L'accesso tramite IP locale può avvenire su HTTP durante lo sviluppo; le funzionalità che richiedono obbligatoriamente un contesto sicuro restano fuori dal flusso base o vengono segnalate separatamente.
- La configurazione di rete dell'host, del firewall e del Wi-Fi deve consentire ai dispositivi di raggiungere la porta esposta; la feature gestisce gli errori applicativi ma non modifica automaticamente la rete.
- La modalità demo browser-only esistente può rimanere disponibile per prove individuali, purché sia etichettata come non condivisa.
- Questa specifica documenta comportamento e criteri di accettazione; la scelta del trasporto, della persistenza e dell'algoritmo concreto per gli identificatori appartiene alla fase di pianificazione.
