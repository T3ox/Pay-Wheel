import { formatEuro, parseEuroInput } from '@pay-wheel/domain';

export function MoneyInput({ value, onChange }: { value: string; onChange: (value: string, cents: number | null) => void }) {
  const cents = parseEuroInput(value);
  return <label className="money-field">Totale pagato
    <span className="money-input-wrap"><span>€</span><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value, parseEuroInput(event.target.value))} placeholder="0,00" aria-describedby="money-preview" /></span>
    <small id="money-preview">{cents ? `Verranno registrati ${formatEuro(cents)}` : 'Inserisci un importo tra €0,01 e €500,00'}</small>
  </label>;
}

