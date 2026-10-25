# Research: Ruota singleton condivisa in rete

## Decision 1 — Riutilizzare il workspace interno come aggregate singleton

**Decision**: usare `groups/{INTERNAL_GROUP_ID}` come unico documento radice e `openOutingId` come puntatore alla ruota corrente.

**Rationale**: il modello esistente crea già il workspace in modo idempotente e tutte le callable conoscono `INTERNAL_GROUP_ID`. La transazione che crea una ruota può controllare e assegnare il puntatore senza finestre di concorrenza.

**Alternatives considered**: nuovo documento `wheel/current`, singleton in memoria della Function, lock esterno. Il primo duplica la fonte di verità; il secondo non è condiviso tra istanze serverless; il terzo è inutile perché Firestore offre transazioni ottimistiche.

## Decision 2 — Ruota persistita come documento separato

**Decision**: mantenere `groups/{groupId}/outings/{outingId}` con partecipanti in sottocollezione, aggiungendo una revisione monotona.

**Rationale**: separa il puntatore singleton dallo storico, mantiene query e Security Rules esistenti e consente di preservare risultato, fairness snapshot e pagamento.

**Alternatives considered**: incorporare tutti i partecipanti nel documento workspace o sovrascrivere sempre `wheel/current`. Entrambe rendono più fragile lo storico e aumentano la contesa su un solo documento.

## Decision 3 — Estrazione esclusivamente server-side

**Decision**: lo spin ricalcola la preview nella transazione, usa casualità del runtime backend e persiste il pagante prima di rispondere.

**Rationale**: impedisce manipolazione dal client, garantisce un solo risultato e permette a richieste concorrenti di leggere lo stesso esito già persistito.

**Alternatives considered**: risultato calcolato dal browser, seed condiviso, animazione come fonte del risultato. Tutte affidano autorità al client o confondono la presentazione con la decisione.

## Decision 4 — Realtime tramite listener Firestore

**Decision**: osservare workspace, ruota e partecipanti con listener già disponibili, usando la revisione per ignorare stati obsoleti.

**Rationale**: il progetto dipende già da Firestore e supporta cache multi-tab e riconnessione. Non serve introdurre WebSocket personalizzati.

**Alternatives considered**: polling, Server-Sent Events, WebSocket dedicato. Aumentano latenza o infrastruttura senza beneficio per 20 dispositivi.

## Decision 5 — Identificatori compatibili centralizzati

**Decision**: introdurre una utility UUID condivisa dal client con feature detection e fallback conforme al formato accettato dal backend.

**Rationale**: evita chiamate sparse a un'API assente nei contesti HTTP su IP locale e mantiene compatibilità con lo schema `uuid()`.

**Alternatives considered**: rendere obbligatorio HTTPS anche in sviluppo, usare contatori o timestamp semplici, aggiungere una libreria. HTTPS resta preferito ma non risolve tutti i test locali; contatori e timestamp collidono; una dipendenza è superflua per una funzione piccola e testabile.

## Decision 6 — Produzione sempre collegata a Firebase

**Decision**: le build Vercel/CI non possono ricadere automaticamente nella demo locale quando la configurazione Firebase manca.

**Rationale**: una pubblicazione che sembra condivisa ma salva in `localStorage` produce ruote divergenti e nasconde un errore di configurazione.

**Alternatives considered**: fallback silenzioso, banner di avviso mantenendo la demo pubblica. Il fallback silenzioso è ingannevole; il banner non rende i dati condivisi.

## Decision 7 — Identità aziendale esistente

**Decision**: riusare Firebase Authentication e la membership nel workspace interno; nessuna stanza o codice invito.

**Rationale**: il prodotto è definito come workspace aziendale singolo e le Rules richiedono un membro attivo. L'identità stabile previene duplicati tra ricariche e schede.

**Alternatives considered**: accesso anonimo pubblico o nickname senza autenticazione. Richiederebbero nuove regole anti-abuso e cambierebbero il perimetro di sicurezza.
