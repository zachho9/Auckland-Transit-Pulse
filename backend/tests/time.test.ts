import { getNzDateAndHour } from '../src/lib/time';

describe('getNzDateAndHour', () => {
  it('converts a UTC instant to NZ date and hour (winter, NZST = UTC+12)', () => {
    // 2026-06-14T12:00:00Z + 12h = 2026-06-15T00:00 NZST
    expect(getNzDateAndHour(new Date('2026-06-14T12:00:00.000Z'))).toEqual({
      date: '2026-06-15',
      hour: 0,
    });
  });

  it('converts a UTC instant to NZ date and hour (summer, NZDT = UTC+13)', () => {
    // 2026-01-14T12:00:00Z + 13h = 2026-01-15T01:00 NZDT
    expect(getNzDateAndHour(new Date('2026-01-14T12:00:00.000Z'))).toEqual({
      date: '2026-01-15',
      hour: 1,
    });
  });

  it('does not roll over to the next day for a late-evening NZ time', () => {
    // 2026-06-14T10:59:00Z + 12h = 2026-06-14T22:59 NZST
    expect(getNzDateAndHour(new Date('2026-06-14T10:59:00.000Z'))).toEqual({
      date: '2026-06-14',
      hour: 22,
    });
  });
});
