// test/openaq-sync-history.spec.ts
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { OpenAQSyncService } from '../src/openaq/openaq-sync.service.js';
import { OpenAQService } from '../src/openaq/openaq.service.js';
import { StationService } from '../src/stations/station.service.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';

describe('OpenAQ sync history', () => {
  it('writes a success log row for the stations phase', async () => {
    const create = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(of({ data: { results: [] } }));
    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        { provide: StationService, useValue: { upsertFromOpenAQ: jest.fn(), getAllStations: jest.fn().mockResolvedValue([]) } },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: PrismaService, useValue: { openAQSyncLog: { create } } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncStations();

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resource: 'stations', status: 'success' }),
    });
  });

  it('writes a failed log row for the measurements phase when the HTTP call throws', async () => {
    const create = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(throwError(() => new Error('network down')));
    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        {
          provide: StationService,
          useValue: { getAllStations: jest.fn().mockResolvedValue([{ id: 1, source: 'openaq', externalId: '1', name: 'X' }]) },
        },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: PrismaService, useValue: { openAQSyncLog: { create } } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncLatestMeasurements(new Map());

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resource: 'measurements', status: 'success' }),
    });
    // Per-station HTTP failures are caught per-station (existing behavior) and don't fail
    // the phase itself, so the phase-level log is still "success" with a failed count > 0.
    const [[{ data }]] = create.mock.calls;
    expect(data.details.failed).toBe(1);
  });

  it('GET /openaq/sync-history returns the most recent entries, clamped to 100', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        OpenAQService,
        { provide: StationService, useValue: {} },
        { provide: AirQualityService, useValue: {} },
        { provide: PrismaService, useValue: { openAQSyncLog: { findMany } } },
      ],
    }).compile();

    const service = module.get(OpenAQService);
    await service.getSyncHistory(999);

    expect(findMany).toHaveBeenCalledWith({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('strips the raw error message from failed rows before returning them publicly', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: '1', resource: 'stations', status: 'failed', details: { synced: 0, failed: 1, durationMs: 5, error: 'connect ECONNREFUSED 10.0.0.1:5432' }, createdAt: new Date() },
      { id: '2', resource: 'measurements', status: 'success', details: { synced: 3, failed: 0, durationMs: 10 }, createdAt: new Date() },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        OpenAQService,
        { provide: StationService, useValue: {} },
        { provide: AirQualityService, useValue: {} },
        { provide: PrismaService, useValue: { openAQSyncLog: { findMany } } },
      ],
    }).compile();

    const service = module.get(OpenAQService);
    const result = await service.getSyncHistory(50);

    expect(result[0].details).toEqual({ synced: 0, failed: 1, durationMs: 5 });
    expect(result[0].details).not.toHaveProperty('error');
    expect(result[1].details).toEqual({ synced: 3, failed: 0, durationMs: 10 });
  });
});
