export function getNzDateAndHour(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;

  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    hour: parseInt(lookup.hour, 10),
  };
}
