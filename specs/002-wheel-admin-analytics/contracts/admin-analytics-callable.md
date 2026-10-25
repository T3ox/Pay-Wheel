# Contract: `getAdminAnalytics`

## Purpose

Restituire statistiche economiche e di estrazione del workspace interno soltanto a un amministratore attivo.

## Authorization

La callable MUST, nell'ordine:

1. richiedere un'identità autenticata e ammessa al workspace interno;
2. caricare la membership autoritativa;
3. verificare `status === active`;
4. verificare claim `payWheelAdmin === true` oppure membership `access === admin`.

La presenza della route o del link client non partecipa alla decisione. Un fallimento non restituisce dati parziali.

## Request

```ts
type GetAdminAnalyticsRequest =
  | { period: 'week'; weekId: string }
  | { period: 'all' };
```

### Validation

- `period` ammette soltanto `week` o `all`.
- `weekId` è obbligatorio soltanto per `week` e usa formato `YYYY-MM-DD`.
- Il `weekId` richiesto deve essere una settimana valida nel timezone del workspace; una settimana senza dati restituisce uno zero-state, non `NOT_FOUND`.

## Success response

```ts
interface GetAdminAnalyticsResponse {
  period: {
    kind: 'week' | 'all';
    weekId: string | null;
  };
  availableWeekIds: string[];
  completedOutingCount: number;
  totalSpentCents: number;
  personCount: number;
  incompleteSourceCount: number;
  rows: Array<{
    userId: string;
    displayName: string;
    spentCents: number;
    drawCount: number;
    eligibleParticipationCount: number | null;
    totalParticipationCount: number;
    selectionRateBps: number | null;
    outingShareBps: number | null;
    lastDrawnAt: string | null;
  }>;
  generatedAt: string;
}
```

### Response invariants

- Valori monetari sono centesimi interi EUR.
- Basis points sono interi; 10.000 equivale a 100%.
- `selectionRateBps` è null quando `eligibleParticipationCount` è zero o non affidabile.
- `outingShareBps` è null quando `completedOutingCount` è zero.
- `rows` non dipende dall'ordinamento richiesto dal client; la UI può ordinare localmente.
- `availableWeekIds` è decrescente e include soltanto settimane con aggregato disponibile.

## Error contract

| Condition | Callable code | Detail code | Client behavior |
|-----------|---------------|-------------|-----------------|
| nessuna sessione | `unauthenticated` | `UNAUTHENTICATED` | tornare all'ingresso |
| identità non interna | `permission-denied` | `INTERNAL_ACCESS_DENIED` | nessun dato, mostrare accesso negato |
| membership non attiva | `permission-denied` | `NOT_GROUP_MEMBER` | cancellare cache e tornare alla ruota/ingresso |
| membro non admin | `permission-denied` | `ADMIN_REQUIRED` | cancellare cache e reindirizzare a `/` |
| input periodo invalido | `invalid-argument` | `INVALID_PERIOD` | mostrare errore non retryable |
| aggregati temporaneamente indisponibili | `unavailable` | `ANALYTICS_UNAVAILABLE` | consentire retry manuale |

## Security and privacy

- La callable non accetta `groupId`; usa il workspace interno configurato sul server.
- Non restituisce email, claim, ID token, motivi di correzione o dati account.
- I log includono periodo, conteggio righe e outcome autorizzazione, ma non importi o nomi.
- I dati non devono essere persistiti in storage browser permanente; restano nello stato della pagina e vengono rimossi su logout, revoca o unmount.

## Aggregation contract

### Week

Legge il documento settimanale e restituisce valori zero se assente.

### All

Unisce ogni settimana disponibile:

- somma conteggi e centesimi;
- somma le statistiche con lo stesso `userId`;
- usa il display name del record con `lastDrawnAt`/settimana più recente;
- propaga `eligibleParticipationCount: null` se una sorgente rilevante della persona è incompleta;
- ricalcola basis points dopo il merge, senza sommare o mediare percentuali settimanali.

## Test vectors

1. 4 uscite, Anna eleggibile 4 volte e selezionata 1: `selectionRateBps = 2500`, `outingShareBps = 2500`.
2. 4 uscite, Bruno eleggibile 2 volte e selezionato 1: `selectionRateBps = 5000`, `outingShareBps = 2500`.
3. Persona solo protetta: `eligibleParticipationCount = 0`, `selectionRateBps = null`, `drawCount = 0`.
4. Correzione da 800 a 650 centesimi: `totalSpentCents` e payer `spentCents` diminuiscono di 150; i conteggi non cambiano.
5. Retry stesso outing: nessun campo aggregato cambia.
