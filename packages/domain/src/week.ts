function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function getWeekId(date: Date, timezone = 'Europe/Rome'): string {
  const { year, month, day } = localDateParts(date, timezone);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = localAsUtc.getUTCDay() || 7;
  localAsUtc.setUTCDate(localAsUtc.getUTCDate() - weekday + 1);
  return localAsUtc.toISOString().slice(0, 10);
}

export function isProtectedThisWeek(lastPaidWeekId: string | null, date: Date, timezone = 'Europe/Rome') {
  return lastPaidWeekId !== null && lastPaidWeekId === getWeekId(date, timezone);
}

