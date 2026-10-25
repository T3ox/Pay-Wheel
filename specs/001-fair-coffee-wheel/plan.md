# Implementation Plan: semplificazione Chwazi-inspired

**Feature context**: `001-fair-coffee-wheel` | **Git checkout**: `develop` | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)

**Input**: semplificare Pay Wheel ispirandosi all'immediatezza di Chwazi; all'apertura mostrare soltanto una CTA di accesso, consentire in test l'ingresso senza Firebase e rimuovere creazione gruppo e inviti perché l'app è destinata a una sola azienda.

## Summary

Pay Wheel diventa una single-purpose app full-screen: una sola azione evidente per entrare, accesso automatico a uno spazio aziendale preconfigurato e ruota come superficie principale. L'ispirazione a Chwazi riguarda immediatezza, densità minima, colori piatti e feedback circolare; non verranno copiati brand, asset o layout proprietari.

La prima iterazione usa `VITE_TEST_MODE=true`: la CTA `Aggiungimi` crea una sessione locale persistita, apre o recupera l'uscita corrente e aggiunge l'utente senza Firebase. In produzione la stessa posizione ospita `Entra`, avvia Google Sign-In e una callable idempotente abilita l'utente nello spazio interno configurato. Non esistono più onboarding, creazione gruppo, codici invito o impostazioni gruppo.

## Scope Delta

### In scope

- Schermata iniziale priva di logo, titolo, descrizione, privacy copy o altre azioni: un solo bottone visibile.
- Modalità test locale senza Firebase e senza dipendenza dalla rete.
- Un solo spazio aziendale definito a configurazione, non selezionabile dall'utente.
- Accesso produzione con provisioning automatico e allowlist del dominio aziendale.
- Home full-screen centrata sulla ruota, con CTA contestuali ridotte al minimo.
- Classifica, storico, profilo e stato rete accessibili da un menu secondario discreto, non da una shell permanente.
- Conservazione di algoritmo di equità, protezione settimanale, pagamento e sincronizzazione condivisa.
- Rimozione di route, componenti, callable e test relativi a gruppi e inviti.

### Out of scope

- Multi-tenant, scelta azienda, gruppi personali, inviti e ruoli owner visibili.
- Replica del multitouch di Chwazi o uso condiviso dello stesso schermo.
- Copia di colori, suoni, icone, animazioni o altri asset di Chwazi.
- Modifica dell'algoritmo di estrazione o delle regole economiche già definite.

## Experience Contract

### Stato 0 — ingresso

- Viewport intera con fondo piatto.
- Unico elemento visibile e focalizzabile: CTA centrale `Aggiungimi` in test, `Entra` in produzione.
- Nessun testo accessorio. Gli stati loading ed errore riusano la stessa area; l'errore è annunciato agli screen reader e può comparire soltanto dopo un tentativo.
- In test, il click crea l'attore locale e lo iscrive direttamente all'uscita corrente.
- In produzione, il click autentica, esegue il bootstrap nello spazio interno e poi iscrive l'utente.

### Stato 1 — uscita aperta

- Ruota grande al centro, partecipanti espressi con colori saturi e nome breve.
- Una sola CTA primaria per stato: `Aggiungimi`, `Non partecipo` oppure `Gira`.
- Conteggio e dettagli di equità sono disponibili in un pannello accessibile su richiesta, non sempre visibili.
- Nessuna card decorativa, sidebar, bottom navigation, gradienti, emoji o testi promozionali.

### Stato 2 — estrazione e risultato

- Animazione circolare fluida verso un risultato già deciso dal dominio/backend.
- Risultato full-screen con nome del pagante e unica azione successiva pertinente.
- `prefers-reduced-motion` sostituisce lo spin con un reveal breve.

### Navigazione secondaria

- Un controllo iconico con accessible name apre un bottom sheet/menu contenente `Classifica`, `Storico`, `Profilo` e `Esci`.
- Le sezioni secondarie usano superfici piane e un solo livello di gerarchia.
- Il menu non è presente nella schermata iniziale anonima.

## Technical Context

**Language/Version**: TypeScript strict; Node.js 22 LTS

**Primary Dependencies**: React 19, React Router 7, Vite 7, Firebase Web SDK 13, Zod 4, `vite-plugin-pwa`

**Storage**: localStorage isolato per test mode; Firestore nello spazio aziendale fisso per produzione

**Testing**: Vitest, React Testing Library, Firebase Emulator Suite, Playwright, Lighthouse CI

**Target Platform**: web responsive e PWA installabile, mobile-first, browser evergreen

**Project Type**: monorepo web app + Firebase Functions + dominio condiviso

**Performance Goals**: prima CTA interattiva entro 1,5 s su rete mobile media; transizione CTA→ruota entro 300 ms in test; 60 fps durante lo spin sui device target; risultato condiviso entro 8 s

**Constraints**: WCAG 2.2 AA; una sola CTA visibile all'ingresso; nessuna configurazione gruppo nell'app; mutazioni condivise autoritative; test mode chiaramente separato dalla build di produzione

**Scale/Scope**: una azienda, 2–25 partecipanti per uscita, fino a 200 utenti interni e 20 sessioni concorrenti

## Constitution Check

La costituzione contiene ancora placeholder e non impone gate ratificati. Il piano applica comunque i gate già adottati dal progetto:

- PASS — la semplificazione non sposta probabilità o risultato nel browser in produzione;
- PASS — test mode e produzione hanno adapter distinti e non condividono credenziali o dati;
- PASS — il flusso senza testo conserva nome accessibile, focus visibile e annunci degli stati;
- PASS — il percorso critico viene coperto da test component, E2E e reduced-motion;
- PASS — la rimozione del multi-gruppo riduce superficie e complessità.

**Post-design re-check**: PASS. Il modello conserva il namespace Firestore esistente come dettaglio interno per evitare una migrazione rischiosa, ma elimina tutti i contratti utente di creazione e invito.

## Project Structure

### Documentation

```text
specs/001-fair-coffee-wheel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-ux-spec.md
└── contracts/
    ├── callable-functions.md
    ├── realtime-data.md
    └── ui-state-machine.md
```

### Source Code

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   └── MinimalShell.tsx
├── components/core/
│   ├── Button.tsx
│   ├── Dialog.tsx
│   └── VisuallyHidden.tsx
├── features/entry/
│   ├── EntryPage.tsx
│   ├── SessionProvider.tsx
│   └── adapters/
│       ├── firebaseSessionAdapter.ts
│       └── localTestSessionAdapter.ts
├── features/outings/
│   ├── OutingPage.tsx
│   ├── Wheel.tsx
│   ├── DrawResult.tsx
│   └── OutingDetailsSheet.tsx
├── features/leaderboard/
├── features/history/
├── features/payments/
├── features/settings/
└── styles/
    ├── tokens.css
    └── app.css

functions/src/callable/
├── bootstrapInternalSession.ts
├── joinCurrentOuting.ts
├── previewOuting.ts
├── spinOuting.ts
└── confirmPayment.ts

packages/domain/src/
└── ...
```

**Structure Decision**: riutilizzare il monorepo esistente. `features/auth` e `features/groups` confluiscono in `features/entry`; `AppShell`, `GroupOnboardingPage`, `GroupSettingsPage` e `ArchivedGroupGuard` vengono rimossi. Gli adapter impediscono che il codice locale di test entri nei percorsi Firebase.

## Architecture

### Session modes

```text
EntryPage
   └── SessionProvider.enter()
       ├── test: local adapter → actor locale → join locale
       └── prod: Google Auth → bootstrapInternalSession → joinCurrentOuting
```

- `VITE_TEST_MODE=true` è ammesso solo in locale/preview non produttive; la build CI production fallisce se il flag è attivo.
- L'attore test è persistito con ID casuale stabile per browser; non usa email reale e non chiama Firebase.
- In produzione `bootstrapInternalSession` verifica `auth.token.email_verified`, dominio consentito e stato dell'utente, quindi crea/riattiva la membership nello spazio fisso.
- Il client non invia un `groupId`: il backend legge `INTERNAL_GROUP_ID` dalla configurazione server.

### Compatibility strategy

- Firestore continua inizialmente a usare `groups/{INTERNAL_GROUP_ID}/...` per non migrare uscite e pagamenti.
- `Group` diventa `InternalWorkspace` nel linguaggio applicativo; nome, owner e invite non vengono letti dal client.
- Le callable multi-gruppo vengono sostituite da contratti senza `groupId`; quelle obsolete restano disabilitate prima di essere eliminate.
- Le membership esistenti del gruppo scelto vengono conservate; inviti e gruppi non scelti non sono accessibili dal nuovo client.

### UI state ownership

- La route `/` decide tra `entry`, `joining`, `outing`, `spinning` e `result`.
- Leaderboard/history/profile sono route secondarie o sheet, raggiungibili solo dopo session bootstrap.
- Non viene mostrato un layout intermedio di onboarding.
- Ogni stato espone una sola primary action; azioni meno frequenti sono nel menu o nel dettaglio.

## Implementation Sequence

### Phase A — allineamento e guardrail

1. Introdurre `VITE_TEST_MODE`, validazione env e fail-fast della build production.
2. Definire `INTERNAL_GROUP_ID` e allowlist dominio nelle Functions.
3. Aggiungere test di contratto che vietano route e callable di creazione/invito.
4. Congelare l'algoritmo fairness con i test esistenti per dimostrare che il redesign non lo modifica.

### Phase B — ingresso unico

1. Sostituire `AuthProvider` + onboarding con `SessionProvider` e due adapter.
2. Creare `EntryPage` con un solo elemento visibile nel DOM applicativo.
3. Implementare bootstrap e auto-membership production.
4. In test, fare click-through diretto verso join/apertura uscita locale.

### Phase C — shell e visual system

1. Rimuovere sidebar, bottom nav, team chip, card marketing e gradienti.
2. Applicare fondo full-bleed, sistema colori piatti, tipografia di sistema e geometrie circolari.
3. Aggiungere il menu secondario accessibile.
4. Conservare focus, contrasto, target 44 px e safe areas.

### Phase D — outing Chwazi-inspired

1. Rendere la ruota il centro visivo e ridurre le informazioni sempre visibili.
2. Unificare open/join in `joinCurrentOuting` idempotente.
3. Mostrare una sola CTA primaria in base allo stato e spostare probabilità/partecipanti nel dettaglio.
4. Ridisegnare spin e result mantenendo il risultato autoritativo e reduced motion.

### Phase E — rimozione multi-gruppo

1. Eliminare route, componenti, analytics e test per onboarding gruppo, inviti, owner e archiviazione.
2. Rimuovere callable `createGroup`, `joinGroup`, `createInvite`, `revokeInvite`, `transferOwnership`, `archiveGroup`, `leaveGroup` dal client e poi dal deploy.
3. Aggiornare Security Rules: accesso al solo workspace interno e provisioning esclusivamente server-side.
4. Migrare la correzione del pagamento da `owner` a payer o amministratore con custom claim.

### Phase F — validazione e rollout

1. Eseguire test DOM della schermata iniziale, E2E test mode e E2E Firebase Emulator.
2. Verificare mobile 320 px, desktop, tastiera, screen reader, zoom 200% e reduced motion.
3. Fare rollout in preview interna, poi staging con dominio aziendale, infine produzione.
4. Conservare per un rilascio una route di rollback che usa il vecchio client ma non espone nuove creazioni/inviti.

## Quality Gates

1. **Entry DOM**: prima dell'interazione esiste un solo controllo visibile; nessun heading, paragrafo, logo o nav.
2. **Test mode isolation**: zero richieste Firebase e nessun import dinamico del client Firebase nel percorso locale.
3. **Production access**: account fuori dominio rifiutato; account ammesso auto-provisionato una sola volta.
4. **No group UX**: nessuna route o stringa utente per creare gruppo, invito, owner o codice invito.
5. **Fairness regression**: tutti i vettori di probabilità, protezione e pagamento esistenti restano verdi.
6. **Concurrency**: due spin simultanei producono un risultato; due join sono idempotenti.
7. **Accessibility**: CTA con nome accessibile, focus visibile, errore annunciato, menu e dialog tastiera, reduced motion.
8. **Visual simplicity**: screenshot regression su entry, outing, spin e result; niente card/shadow/gradient non autorizzati.

## Migration and Rollback

- Selezionare e configurare l'attuale gruppo aziendale come `INTERNAL_GROUP_ID`.
- Fare snapshot di Firestore prima di disabilitare le callable multi-gruppo.
- Mantenere documenti group/invite non utilizzati in sola lettura per 30 giorni; eliminarli solo con attività separata approvata.
- Il rollback ripristina la vecchia UI puntando allo stesso spazio e agli stessi dati; nessuna migrazione distruttiva è necessaria per questa modifica.

## Complexity Tracking

Nessuna violazione costituzionale. Il namespace `groups/{id}` resta temporaneamente pur avendo un solo spazio: è una scelta di compatibilità per evitare una migrazione dati non necessaria, non una funzionalità multi-gruppo esposta.
