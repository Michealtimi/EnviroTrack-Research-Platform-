import { formatHazardousReadingsAsCsv } from '../src/air-quality/hazardous-csv.util.js';

describe('formatHazardousReadingsAsCsv', () => {
  it('produces one row per exceedance for a reading with multiple exceedances', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r1', stationId: 7, stationName: 'Ijebu-Ode Roadside',
        measuredAt: new Date('2026-07-15T09:00:00.000Z'), createdAt: new Date('2026-07-15T09:05:00.000Z'),
        isSuspect: false,
        exceedances: [
          { pollutant: 'no2', value: 325, limit: 25, factor: 13 },
          { pollutant: 'pm25', value: 18, limit: 15, factor: 1.2 },
        ],
      },
    ]);

    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 exceedance rows
    expect(lines[0]).toBe('stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId');
    expect(lines[1]).toBe('7,Ijebu-Ode Roadside,no2,325,25,13,2026-07-15T09:00:00.000Z,false,r1');
    expect(lines[2]).toBe('7,Ijebu-Ode Roadside,pm25,18,15,1.2,2026-07-15T09:00:00.000Z,false,r1');
  });

  it('falls back to createdAt when measuredAt is null', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r2', stationId: 1, stationName: 'Lagos Central',
        measuredAt: null, createdAt: new Date('2026-08-01T12:00:00.000Z'),
        isSuspect: false,
        exceedances: [{ pollutant: 'pm10', value: 50, limit: 45, factor: 1.1 }],
      },
    ]);

    expect(csv.trim().split('\n')[1]).toContain('2026-08-01T12:00:00.000Z');
  });

  it('quotes a station name containing a comma, per RFC 4180', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r3', stationId: 2, stationName: 'Lagos, Ikeja',
        measuredAt: new Date('2026-08-01T00:00:00.000Z'), createdAt: new Date('2026-08-01T00:00:00.000Z'),
        isSuspect: true,
        exceedances: [{ pollutant: 'co', value: 5000, limit: 4000, factor: 1.3 }],
      },
    ]);

    expect(csv.trim().split('\n')[1]).toContain('"Lagos, Ikeja"');
  });

  it('produces a header-only CSV for an empty readings array', () => {
    const csv = formatHazardousReadingsAsCsv([]);

    expect(csv.trim()).toBe('stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId');
  });
});
