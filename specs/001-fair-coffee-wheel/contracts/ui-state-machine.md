# Contract: macchina a stati UI

## Top-level states

| State                    | Visible primary control | Secondary UI   | Transition                                  |
| ------------------------ | ----------------------- | -------------- | ------------------------------------------- |
| `entry.test`             | `Aggiungimi`            | none           | local session + join → `outing.joined`      |
| `entry.production`       | `Entra`                 | none           | Google + bootstrap + join → `outing.joined` |
| `entry.pending`          | stessa CTA, loading     | none           | success or `entry.error`                    |
| `entry.error`            | `Riprova`               | concise error  | retry                                       |
| `outing.notJoined`       | `Aggiungimi`            | menu + details | join → `outing.joined`                      |
| `outing.joined.waiting`  | `Non partecipo`         | menu + details | leave or participant update                 |
| `outing.joined.ready`    | `Gira`                  | menu + details | spin → `outing.spinning`                    |
| `outing.spinning`        | none                    | menu locked    | result → `outing.result`                    |
| `outing.result.payer`    | `Inserisci totale`      | result details | payment → next outing                       |
| `outing.result.observer` | none                    | result details | realtime update                             |

## Entry DOM contract

Prima di qualsiasi interazione:

- un solo elemento visibile con ruolo interattivo;
- nessun `h1`–`h6`, `p`, logo, nav, avatar o privacy copy;
- un solo landmark `main`;
- CTA raggiungibile con Tab e attivabile con Enter/Space;
- live region presente ma visivamente nascosta e vuota.

## Primary action precedence

```text
no session > join > payment > spin > leave
```

Una azione con precedenza maggiore nasconde quelle inferiori. Esempio: il payer vede `Inserisci totale`, non `Gira` o `Non partecipo`.

## Visual motion contract

- UI statica: nessuna animazione continua.
- Spin standard: 2,8–3,8 secondi, solo `transform`, easing decelerato.
- Reduced motion: massimo 200 ms di cross-fade, nessuna rotazione multipla.
- Il valore casuale visuale non può cambiare il payer persistito.

## Accessibility contract

- Il bottone iconico del menu ha accessible name `Apri menu`.
- La ruota ha alternativa testuale nel details sheet.
- Risultato annunciato una sola volta con `aria-live=polite`.
- Gli errori usano `role=alert`; il focus resta sulla CTA salvo dialog bloccante.
- Colore, posizione e animazione non sono gli unici indicatori di partecipante, protezione o vincitore.
