# UI/UX Specification: Pay Wheel basic, Chwazi-inspired

## Design intent

L'interfaccia deve sembrare uno strumento, non un portale: si apre, presenta una singola decisione e reagisce subito. Da Chwazi prendiamo immediatezza, presenza centrale della forma circolare e colori netti. Identità, palette e comportamento restano originali.

## Principles

1. **Una azione per volta**: nessuna concorrenza tra CTA primarie.
2. **Zero onboarding**: l'azienda è già configurata.
3. **Zero copy promozionale**: il prodotto si spiega attraverso l'azione.
4. **Full-screen**: nessuna card dentro un'altra shell.
5. **Dettagli on demand**: trasparenza disponibile, non rumorosa.
6. **Motion funzionale**: animazione soltanto per feedback e sorteggio.

## Visual system

### Base tokens

| Token       | Value     | Use                          |
| ----------- | --------- | ---------------------------- |
| `--bg`      | `#111318` | fondo principale             |
| `--surface` | `#1B1E25` | sheet e dialog               |
| `--text`    | `#F7F7F3` | testo primario               |
| `--muted`   | `#A8ACB7` | dettagli secondari           |
| `--focus`   | `#FFFFFF` | focus ring ad alto contrasto |
| `--danger`  | `#FF5A67` | errore/azione distruttiva    |

Palette partecipanti originale: `#48D7FF`, `#FF5DB1`, `#FFD84D`, `#65E58B`, `#A989FF`, `#FF8A4C`, `#3CE6CF`, `#F36C6C`. `colorKey` seleziona un colore in modo stabile; il significato non dipende dal colore.

### Shape and depth

- Raggi circolari o 16 px; nessuna collezione di card.
- Ombre assenti; separazione tramite fondo, bordo 1 px e spazio.
- CTA primaria pill/circle con altezza minima 56 px.
- Tipografia system sans; un solo peso regular e uno semibold.
- Nessuna emoji o illustrazione decorativa.

## Entry screen

```text
┌──────────────────────────────┐
│                              │
│                              │
│        [ Aggiungimi ]        │
│                              │
│                              │
└──────────────────────────────┘
```

- Solo `main` e bottone.
- Bottone centrato; larghezza contenuto con min-width 160 px.
- Test mode: `Aggiungimi`.
- Production: `Entra`.
- Loading: stessa geometria, label accessibile `Accesso in corso`.
- Errore: testo breve sotto la CTA solo dopo fallimento; CTA diventa `Riprova`.

## Main outing

```text
┌──────────────────────────────┐
│                         [⋯]  │
│                              │
│           ◜────◝             │
│         ◜  WHEEL ◝           │
│         ◟        ◞           │
│           ◟────◞             │
│                              │
│           [ Gira ]           │
└──────────────────────────────┘
```

- Menu in alto a destra, 44×44 px, nome accessibile.
- Ruota `min(78vw, 520px)` e mai più del 62% dell'altezza utile.
- CTA nella safe area inferiore; non sticky sopra contenuto scrollabile perché la pagina principale non deve scrollare in condizioni normali.
- Nome partecipanti dentro la ruota soltanto quando leggibile; la lista completa è nel details sheet.
- Chi è protetto resta visibile con opacità ridotta più pattern/etichetta nel dettaglio.

## Primary action rules

| Condition                | Action                 |
| ------------------------ | ---------------------- |
| no session               | `Aggiungimi` / `Entra` |
| session, not joined      | `Aggiungimi`           |
| joined, fewer than 2     | `Non partecipo`        |
| joined, ready            | `Gira`                 |
| spinning                 | no action              |
| caller is payer          | `Inserisci totale`     |
| completed/no open outing | `Aggiungimi`           |

Gli stati non devono mostrare due button primari affiancati.

## Result

- Fondo usa il colore del payer con contrasto calcolato.
- Nome grande al centro; label breve `Paga` può comparire sopra se necessaria a evitare ambiguità.
- Nessun confetti loop.
- Il payer vede `Inserisci totale`; gli altri vedono il risultato senza CTA primaria.
- Il menu resta disponibile dopo il reveal.

## Secondary menu and screens

- Bottom sheet su mobile, popover/dialog su desktop.
- Voci testuali: `Classifica`, `Storico`, `Profilo`, `Esci`.
- Classifica e storico usano righe piane separate da linee, non card.
- Profilo contiene soltanto preferenza motion, installazione PWA se applicabile, account/logout.
- Non esistono `Gruppo`, `Inviti`, `Membri`, `Owner` o `Archivia`.

## Responsive behavior

- 320–767 px: ruota e CTA in colonna; sheet dal basso.
- 768–1199 px: ruota più ampia; details come sheet laterale.
- ≥1200 px: contenuto centrale massimo 720 px; nessuna sidebar.
- Safe areas iOS applicate a menu e CTA.
- Landscape basso: ruota e CTA possono disporsi orizzontalmente senza aggiungere navigazione persistente.

## Motion

- Join: pulse singolo 160 ms sul segmento aggiunto.
- Spin: 2,8–3,8 s, almeno tre giri visivi, `transform` only.
- Result: color fill/reveal 180 ms.
- Reduced motion: niente giri; cross-fade ≤200 ms.
- Nessuna animazione idle continua.

## Accessibility

- Contrasto WCAG 2.2 AA; focus ring 3 px.
- CTA con label visibile, non solo icona.
- Menu iconico con accessible name.
- Lista alternativa con nome, probabilità e stato.
- Risultato annunciato una sola volta.
- Pattern + testo distinguono protetti; colore non è unico segnale.
- Target minimo 44×44 px e layout funzionante a zoom 200%.

## Copy inventory

Copy sempre visibile nel percorso primario:

- `Aggiungimi`
- `Entra`
- `Gira`
- `Non partecipo`
- `Inserisci totale`
- nome del risultato

Tutto il resto compare solo in menu, sheet, dialog, errore o sezione secondaria.
