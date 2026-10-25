# Research: semplificazione Chwazi-inspired

## Decision 1 — ispirarsi al principio, non clonare il prodotto

**Decision**: adottare immediatezza, singola azione e feedback circolare di Chwazi, costruendo un'identità visiva propria.

**Rationale**: le descrizioni ufficiali presentano Chwazi come un'esperienza “open and tap”, senza account, rapida e focalizzata su una sola decisione. È il riferimento corretto per ridurre attrito e densità, ma Pay Wheel ha identità, stato condiviso e regole economiche differenti.

**Alternatives considered**:

- Replica pixel-perfect: rifiutata per evitare confusione di brand e perché non risponde ai flussi di pagamento e storico.
- Restyling della shell attuale: rifiutato perché sidebar, card e onboarding continuerebbero a dominare il percorso.

**Sources**: [Google Play — Chwazi Finger Chooser](https://play.google.com/store/apps/details?id=com.tendadigital.chwaziApp), [App Store — Chwazi Finger Chooser](https://apps.apple.com/us/app/chwazi-finger-chooser/id689674978).

## Decision 2 — una sola CTA all'apertura

**Decision**: la schermata anonima contiene soltanto `Aggiungimi` in test oppure `Entra` in produzione.

**Rationale**: logo, headline, descrizione, privacy note e scelta demo/Google creano decisioni prima del valore. La modalità viene scelta dalla build, non dall'utente.

**Alternatives considered**:

- Due CTA “Google” e “Demo”: mantiene complessità e viola la richiesta di semplicità.
- Accesso automatico al caricamento: rende poco chiaro quando vengono creati sessione e partecipazione e peggiora accessibilità/consenso.

## Decision 3 — test mode con adapter locale

**Decision**: `VITE_TEST_MODE=true` usa un adapter locale che crea un attore anonimo persistito e simula il workspace/outing senza inizializzare Firebase.

**Rationale**: consente di validare rapidamente la nuova esperienza e impedisce che assenza o configurazione errata di Firebase blocchino il test visuale.

**Alternatives considered**:

- Firebase Anonymous Auth: richiede comunque progetto, emulatori e configurazione.
- Mock sparsi nei componenti: mescola modalità, aumenta branching e rende difficile dimostrare l'assenza di chiamate Firebase.

## Decision 4 — workspace interno singleton

**Decision**: un solo workspace è configurato dal backend; nessun utente può crearlo, sceglierlo o invitare persone. Il path Firestore `groups/{INTERNAL_GROUP_ID}` viene mantenuto inizialmente come dettaglio tecnico.

**Rationale**: rimuove tutto il dominio multi-gruppo dalla UX e dai contratti senza una migrazione distruttiva dei dati esistenti.

**Alternatives considered**:

- Spostare subito i dati in `/workspace`: schema più pulito ma rollback e migrazione non necessari per un cambiamento di esperienza.
- Hardcode del gruppo solo nel client: insicuro; l'ID non è un segreto e l'autorizzazione deve restare server-side.

## Decision 5 — provisioning automatico in produzione

**Decision**: dopo Google Sign-In, `bootstrapInternalSession` verifica dominio email consentito, email verificata ed eventuale stato disabilitato, poi crea idempotentemente la membership nello spazio fisso.

**Rationale**: un'app interna non necessita inviti, ma continua ad avere bisogno di controllo accessi. La membership serve alle Security Rules e allo storico economico.

**Alternatives considered**:

- Accesso a qualunque account Google: non adeguato per dati aziendali.
- Membership predisposte manualmente: aumenta lavoro operativo e rende il primo accesso fragile.

## Decision 6 — shell full-screen con funzioni secondarie on demand

**Decision**: ruota e CTA occupano la superficie principale; classifica, storico e profilo si aprono da un solo menu discreto.

**Rationale**: le funzioni restano disponibili senza competere con l'azione primaria. Mobile e desktop condividono la stessa gerarchia.

**Alternatives considered**:

- Bottom navigation persistente: quattro destinazioni hanno lo stesso peso visivo della ruota.
- Eliminare classifica e storico: cambierebbe il prodotto oltre la richiesta e ridurrebbe trasparenza dell'equità.

## Decision 7 — visual system piatto e originale

**Decision**: fondo uniforme, superfici senza card, niente gradienti o ombre decorative, tipografia di sistema, forme circolari e palette di colori saturi assegnata stabilmente ai partecipanti.

**Rationale**: riduce il rumore e sostiene l'animazione centrale. I colori non sono l'unico indicatore: nomi e stati restano disponibili nel dettaglio accessibile.

**Alternatives considered**:

- UI monocromatica: semplice ma rende meno leggibili partecipanti e spin.
- Mantenere palette caffè/emoji: comunica un'app promozionale più che uno strumento immediato.

## Decision 8 — una primary action per stato

**Decision**: la macchina a stati UI decide un'unica azione primaria: entrare, aggiungersi, ritirarsi, girare, inserire l'importo o iniziare una nuova uscita.

**Rationale**: evita conflitti tra join, preview e spin. I dettagli tecnici di preview possono aggiornarsi in background; uno stale preview resta un errore recuperabile prima dello spin.

**Alternatives considered**:

- Esporre sempre join e spin: crea due azioni concorrenti e stati disabilitati difficili da capire.
- Spin automatico al raggiungimento di due utenti: elimina il consenso esplicito e peggiora la gestione della concorrenza.

## Decision 9 — accessibilità senza copy visibile aggiuntivo

**Decision**: mantenere CTA testuale, focus visibile, landmark e live region non visiva; errori e loading compaiono solo dopo interazione. Il dettaglio partecipanti offre alternativa semantica alla ruota.

**Rationale**: “nessun testo” non può significare assenza di nome accessibile o feedback. La semplicità visuale deve convivere con WCAG 2.2 AA.

**Source**: [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Decision 10 — rollout senza migrazione distruttiva

**Decision**: cambiare prima client e contratti, disabilitare le operazioni multi-gruppo, osservare un rilascio e solo dopo pianificare eventuale pulizia dati.

**Rationale**: permette rollback immediato e conserva storico, pagamenti e snapshot fairness.

**Alternatives considered**:

- Cancellazione immediata di gruppi/inviti: fuori scope e non recuperabile senza restore.
- Nuovo backend parallelo: duplica lo stato e rischia divergenze.
