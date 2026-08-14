interface HazardousReadingLike {
  id: string | number;
  stationId: number;
  stationName: string;
  measuredAt: Date | null;
  createdAt: Date;
  isSuspect: boolean;
  exceedances: { pollutant: string; value: number; limit: number; factor: number }[];
}

const CSV_HEADER = 'stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId';

function csvField(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatHazardousReadingsAsCsv(readings: HazardousReadingLike[]): string {
  const rows = readings.flatMap((reading) => {
    const when = (reading.measuredAt ?? reading.createdAt).toISOString();
    return reading.exceedances.map((ex) =>
      [
        reading.stationId,
        reading.stationName,
        ex.pollutant,
        ex.value,
        ex.limit,
        ex.factor,
        when,
        reading.isSuspect,
        reading.id,
      ]
        .map(csvField)
        .join(','),
    );
  });

  return [CSV_HEADER, ...rows].join('\n') + '\n';
}
