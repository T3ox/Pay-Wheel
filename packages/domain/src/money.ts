export const MAX_PAYMENT_CENTS = 50_000;
export const COFFEE_PRICE_CENTS = 130;
export const MISSING_AMOUNT_PENALTY_CENTS = 200;

export function parseEuroInput(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 && cents <= MAX_PAYMENT_CENTS ? cents : null;
}

export function formatEuro(cents: number, locale = 'it-IT'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function calculateAutomaticPayment(participantCount: number): number {
  if (!Number.isInteger(participantCount) || participantCount < 1 || participantCount > 25) {
    throw new RangeError('participantCount must be an integer between 1 and 25');
  }
  return COFFEE_PRICE_CENTS * participantCount + MISSING_AMOUNT_PENALTY_CENTS;
}

