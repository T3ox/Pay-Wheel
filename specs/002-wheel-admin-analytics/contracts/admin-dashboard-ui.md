# Contract: dashboard amministrativa e ruota

## Navigation and route states

| Session state | Menu item | `/admin/dashboard` |
|---------------|-----------|--------------------|
| anonymous | non presente | ingresso |
| active member | non presente | redirect `/` |
| active admin | `Dashboard admin` | pagina consentita |
| access revoked | rimosso al refresh | cache rimossa + redirect `/` |

La route non deve renderizzare riepiloghi o placeholder contenenti dati precedenti prima di completare il controllo dell'accesso.

## Dashboard structure

```text
main "Dashboard admin"
├── heading + descrizione privacy
├── period selector
├── summary
│   ├── totale speso
│   ├── uscite concluse
│   └── persone incluse
├── incomplete-data notice (conditional)
└── sortable person table/list
    ├── persona
    ├── speso
    ├── estrazioni
    ├── partecipazioni eleggibili
    ├── tasso su partecipazioni
    └── quota uscite
```

## Page states

### Loading

- Heading e selettore restano identificabili.
- Il contenitore dati espone `aria-busy=true`.
- Nessun valore della selezione precedente viene presentato come corrente.

### Success

- Importi formattati in EUR con due decimali.
- Percentuali formattate da basis points con massimo due decimali.
- `selectionRateBps: null` appare come `Non disponibile`, non `0%`.
- Ordinamento predefinito: totale speso decrescente, poi nome.

### Empty

- Riepilogo mostra `0,00 €`, `0 uscite`, `0 persone`.
- Tabella sostituita da `Nessuna uscita conclusa nel periodo selezionato.`
- Nessuna percentuale viene mostrata.

### Partial/incomplete

- Se `incompleteSourceCount > 0`, un banner spiega che alcune percentuali storiche non sono disponibili.
- Totali monetari affidabili restano visibili.
- Le celle non calcolabili mostrano `Non disponibile`.

### Error/offline

- Nessun dato privato obsoleto è presentato come aggiornato.
- Errore retryable offre `Riprova`.
- `ADMIN_REQUIRED` elimina i dati in memoria e reindirizza alla ruota.

## Sorting contract

- Controlli disponibili: nome, totale speso, percentuale di estrazione.
- Il controllo espone direzione crescente/decrescente a screen reader.
- I valori null seguono sempre i valori numerici, indipendentemente dalla direzione.
- Il cambio ordinamento non effettua una nuova richiesta server.

## Responsive behavior

- Desktop: tabella semantica con header associati alle celle.
- Viewport stretto/zoom: ogni riga può diventare un gruppo verticale, mantenendo etichetta esplicita per ogni valore.
- Nessun contenuto richiede scroll orizzontale a 320 px o zoom 200%.
- Target interattivi almeno 44 × 44 CSS px.

## Wheel rendering contract

Per ogni `FairnessEntry`:

1. il path principale ha un fill colore opaco valido;
2. il fill non dipende da ID di pattern o gradienti;
3. lo stato protetto aggiunge un path interno con `fill="none"` e tratteggio visibile;
4. il nome usa un colore di testo calcolato per il fill;
5. la lista dettagli riporta `Protetto fino a lunedì` e probabilità `0%` quando applicabile.

### Wheel acceptance matrix

| Case | Expected |
|------|----------|
| 0 entries | cerchio neutro con fallback |
| 1 entry | colore valido, nessuna dipendenza da pattern |
| 8 entries | tutti i colori base distinguibili |
| 9 entries | nessuna ripetizione adiacente dovuta al wrap della vecchia palette |
| 25 entries | fill valido per tutti, bordo separatore e lista completa |
| protected | colore persona preservato + overlay + testo semantico |
| override | colore persona preservato + descrizione `Riammesso` |

## Analytics events

Eventi consentiti senza dati economici o nomi:

- `admin_dashboard_opened` con `periodKind`;
- `admin_dashboard_period_changed` con `periodKind`;
- `admin_dashboard_sort_changed` con `sortKey` e `direction`;
- `admin_dashboard_access_denied` con categoria errore.

Gli eventi non includono importi, percentuali, `userId` delle righe o display name.
