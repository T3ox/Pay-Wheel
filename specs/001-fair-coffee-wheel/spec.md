# Feature Specification: Pay Wheel interna e minimale

**Feature context**: `001-fair-coffee-wheel`  
**Created**: 2026-10-23  
**Revised**: 2026-10-24  
**Status**: Planned  
**Input**: PWA React per scegliere equamente chi paga tra colleghi, ridisegnata come esperienza molto semplice ispirata all'immediatezza di Chwazi, con singolo workspace aziendale e test mode senza Firebase.

## Clarifications

### Session 2026-10-24

- Q: Cosa deve apparire all'apertura? → A: nessun logo, titolo, descrizione o navigazione; soltanto una CTA di ingresso.
- Q: Come si prova il flusso prima di integrare Firebase? → A: in test mode la CTA `Aggiungimi` crea una sessione locale e iscrive direttamente l'utente.
- Q: Servono gruppi o inviti? → A: no; l'app è interna a una sola azienda e usa un workspace preconfigurato.
- Q: “Stile Chwazi” significa copiare l'app? → A: no; significa immediatezza, pochi elementi, colori piatti e ruota centrale con identità originale.
- Q: Le regole di equità cambiano? → A: no; probabilità, protezione settimanale, pagamento e storico restano invariati.

### Session 2026-10-23

- Chi è sotto la media riceve un peso maggiore in proporzione; chi è sopra riceve un peso minore, entro 0,5–2 volte il peso base.
- Il pagante resta protetto fino al lunedì successivo alle 00:00 Europe/Rome.
- Dopo un'ora senza importo, il sistema registra `€1,30 × partecipanti + €2,00`; payer o admin possono correggere entro fine settimana.
- Non esistono slot giornalieri; può esserci una sola uscita non conclusa.
- La media include i soli membri attivi che hanno partecipato almeno una volta nella settimana.

## User Scenarios & Testing

### User Story 1 — Entrare con un gesto (Priority: P1)

All'apertura un collega vede una sola CTA. In test seleziona `Aggiungimi` ed entra subito con una sessione locale; in produzione seleziona `Entra`, completa Google Sign-In e viene abilitato automaticamente nel workspace aziendale.

**Independent Test**: aprire una build test senza configurazione Firebase, verificare che sia visibile un solo bottone, selezionarlo e arrivare alla ruota già iscritti.

**Acceptance Scenarios**:

1. **Given** nessuna sessione, **When** si apre l'app test, **Then** l'unico elemento visibile è `Aggiungimi`.
2. **Given** test mode, **When** si seleziona `Aggiungimi`, **Then** non parte alcuna richiesta Firebase e l'utente viene aggiunto all'uscita.
3. **Given** produzione, **When** si seleziona `Entra` con account aziendale valido, **Then** membership e sessione vengono create idempotentemente e non appare onboarding.
4. **Given** un account fuori dominio o disabilitato, **When** tenta l'accesso, **Then** resta sulla stessa schermata e riceve un errore comprensibile.
5. **Given** una sessione valida, **When** si riapre l'app, **Then** viene ripristinata senza mostrare creazione gruppo o inviti.

### User Story 2 — Partecipare ed estrarre (Priority: P1)

La ruota occupa la superficie principale. Il collega si aggiunge o si ritira con una singola azione contestuale. Con almeno due partecipanti, un partecipante seleziona `Gira` e tutti osservano lo stesso risultato.

**Independent Test**: con due sessioni, verificare join idempotente, preview, singolo spin e risultato condiviso.

**Acceptance Scenarios**:

1. Un join aggiunge l'utente una sola volta e crea l'uscita se non esiste.
2. Prima del draw, il partecipante può ritirarsi.
3. Con almeno due partecipanti e preview corrente, `Gira` produce un solo risultato definitivo.
4. Preview obsoleta aggiorna i dati e richiede una nuova attivazione senza estrarre.
5. Chi ha già pagato nella settimana resta visibile ma non eleggibile.
6. La ruota ha una lista semantica equivalente disponibile nel dettaglio.

### User Story 3 — Registrare la spesa (Priority: P2)

Dopo l'estrazione il payer inserisce il totale. Il sistema aggiorna storico e riepilogo e protegge il payer fino al lunedì successivo.

**Acceptance Scenarios**:

1. Un importo positivo con massimo due decimali conclude l'uscita una sola volta.
2. Dopo un'ora senza conferma viene registrato automaticamente `130 × participantCount + 200` centesimi.
3. Payer o amministratore con claim possono correggere un pagamento automatico entro la fine della settimana con audit.
4. Retry e perdita di connessione non duplicano pagamenti.

### User Story 4 — Consultare equità e storico (Priority: P3)

Dal menu secondario un collega apre classifica e storico senza che queste sezioni competano con la ruota nella home.

**Acceptance Scenarios**:

1. La classifica mostra totale, media, scostamento e protezione per i partecipanti della settimana.
2. Lo storico mostra settimane e uscite concluse in sola lettura.
3. Il menu non è presente nella schermata anonima e non include gestione gruppo o inviti.

## Edge Cases

- Se tutti sono protetti, si applica la deroga esistente partendo da chi ha pagato meno recentemente.
- Se un solo partecipante è eleggibile, resta necessario selezionare `Gira`.
- Chiusura pagina durante animazione: alla riapertura compare il risultato persistito.
- Offline produzione: dati cache leggibili, mutazioni disabilitate. Offline test: flusso locale disponibile.
- Nomi lunghi o duplicati sono distinti nel dettaglio semantico.
- Reduced motion elimina la rotazione multipla.
- Un errore iniziale può aggiungere testo soltanto dopo il tentativo; prima dell'interazione resta una sola CTA.
- La build production deve rifiutare test mode attivo.

## Functional Requirements

- **FR-001**: la schermata iniziale MUST mostrare un solo controllo visibile e nessun logo, heading, paragrafo, nav o copy promozionale.
- **FR-002**: in test mode la CTA MUST essere `Aggiungimi`, creare una sessione locale stabile e non inizializzare Firebase.
- **FR-003**: in produzione la CTA MUST essere `Entra` e avviare Google Sign-In.
- **FR-004**: il backend MUST ammettere soltanto account con email verificata appartenente alla allowlist aziendale.
- **FR-005**: l'utente ammesso MUST essere associato idempotentemente a un unico workspace interno configurato.
- **FR-006**: il sistema MUST NOT esporre creazione/selezione/archiviazione gruppo, inviti, owner o trasferimento proprietà.
- **FR-007**: il client MUST NOT inviare un groupId per scegliere il workspace delle nuove callable.
- **FR-008**: join e apertura uscita MUST essere un'unica operazione idempotente; una sola uscita può restare non conclusa.
- **FR-009**: l'utente MUST potersi ritirare solo prima del draw.
- **FR-010**: la UI MUST esporre una sola primary action per stato.
- **FR-011**: con almeno due partecipanti, un partecipante MUST poter richiedere una preview autoritativa e avviare lo spin.
- **FR-012**: partecipanti, pesi e previewVersion MUST essere verificati e congelati dal backend prima del risultato.
- **FR-013**: il backend MUST produrre un solo risultato definitivo anche con richieste concorrenti.
- **FR-014**: la ruota MUST essere una visualizzazione complementare, con alternativa testuale per nomi, probabilità e protezioni.
- **FR-015**: chi ha pagato nel weekId corrente MUST avere probabilità zero fino al lunedì successivo.
- **FR-016**: il peso eleggibile MUST restare tra 0,5 e 2 volte il base weight in proporzione allo scostamento dalla media.
- **FR-017**: le probabilità MUST essere normalizzate tra i soli partecipanti eleggibili e sommare a 1.000.000 micros.
- **FR-018**: il payer MUST poter confermare un importo positivo con massimo due decimali in EUR.
- **FR-019**: dopo un'ora senza importo il sistema MUST creare un pagamento automatico `130 × partecipanti + 200` centesimi.
- **FR-020**: payer o admin claim MUST poter correggere il pagamento automatico entro fine settimana con audit; il ruolo owner non deve essere usato.
- **FR-021**: classifica e storico MUST restare raggiungibili da un menu secondario discreto.
- **FR-022**: la home autenticata MUST evitare sidebar, bottom nav persistente, card decorative, gradienti, emoji e copy promozionale.
- **FR-023**: colori partecipante MUST essere stabili ma non essere l'unico indicatore di stato.
- **FR-024**: la UI MUST rispettare tastiera, screen reader, zoom 200%, viewport 320 px e `prefers-reduced-motion`.
- **FR-025**: browser e PWA installata MUST condividere URL, sessione e dati.
- **FR-026**: la CI production MUST fallire se test mode è abilitato.
- **FR-027**: ogni rilascio MUST verificare algoritmo, concorrenza, access control, entry DOM, test-mode isolation e flussi P1.

## Key Entities

- **Utente**: identità produzione o attore locale test.
- **Workspace interno**: singleton preconfigurato; path group legacy mantenuto solo per compatibilità.
- **Membership**: accesso automatico e stato economico; nessun owner user-facing.
- **Uscita**: sessione condivisa con un solo lifecycle attivo.
- **Partecipazione**: join unico con colore stabile e snapshot al draw.
- **Anteprima/Estrazione**: probabilità autoritative, versione e risultato definitivo.
- **Pagamento/Correzione**: importo, fonte, audit e idempotenza.
- **Riepilogo settimanale**: totali, media, scostamenti e protezione.

## Success Criteria

- **SC-001**: il 100% delle aperture anonime mostra una sola CTA visibile prima dell'interazione.
- **SC-002**: in test, l'utente raggiunge la ruota ed è iscritto con un click e zero chiamate Firebase.
- **SC-003**: in produzione, almeno il 95% degli account aziendali validi raggiunge la ruota senza onboarding al primo tentativo.
- **SC-004**: nessuna route o azione utente permette creazione gruppo o invito.
- **SC-005**: nel 99,9% degli spin completati tutte le sessioni mostrano lo stesso payer e un solo pagamento può essere creato.
- **SC-006**: i test di regressione producono gli stessi risultati per fairness, protezione e pagamento automatico della versione precedente.
- **SC-007**: CTA→ruota richiede meno di 300 ms in test locale e l'ingresso production mostra feedback entro 100 ms.
- **SC-008**: lo spin mantiene 60 fps sui device target o usa reduced motion senza perdita di comprensione.
- **SC-009**: tutti i flussi P1 sono completabili con tastiera, screen reader, zoom 200% e viewport 320 px.

## Assumptions

- Una sola azienda, un solo workspace e lingua italiana.
- Il dominio email aziendale e il workspace vengono configurati fuori dall'app.
- La modalità test è destinata a sviluppo e preview, non a dati condivisi o produzione.
- Classifica, storico, fairness e pagamento restano funzioni del prodotto anche se non dominano la home.
- Amministrazione membri e cleanup dati avvengono fuori dal client pilot.
