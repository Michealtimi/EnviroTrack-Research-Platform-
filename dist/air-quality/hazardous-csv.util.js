"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatHazardousReadingsAsCsv = formatHazardousReadingsAsCsv;
const CSV_HEADER = 'stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId';
function csvField(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function formatHazardousReadingsAsCsv(readings) {
    const rows = readings.flatMap((reading) => {
        const when = (reading.measuredAt ?? reading.createdAt).toISOString();
        return reading.exceedances.map((ex) => [
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
            .join(','));
    });
    return [CSV_HEADER, ...rows].join('\n') + '\n';
}
//# sourceMappingURL=hazardous-csv.util.js.map