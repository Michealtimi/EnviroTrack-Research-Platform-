// test/openaq-sync-v3.spec.ts
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { OpenAQSyncService } from '../src/openaq/openaq-sync.service.js';
import { StationService } from '../src/stations/station.service.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';

describe('OpenAQSyncService v3', () => {
  it('caps station sync at OPENAQ_SYNC_MAX_LOCATIONS and calls the v3 endpoint', async () => {
    const upsertFromOpenAQ = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(
      of({
        data: {
          results: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Station ${i}`,
            country: { name: 'UK' },
            coordinates: { latitude: 1, longitude: 1 },
            sensors: [],
          })),
        },
      }),
    );

    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        { provide: StationService, useValue: { upsertFromOpenAQ, getAllStations: jest.fn().mockResolvedValue([]) } },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'OPENAQ_SYNC_MAX_LOCATIONS' ? '10' : undefined) },
        },
        { provide: HttpService, useValue: { get: httpGet } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncStations();

    expect(upsertFromOpenAQ).toHaveBeenCalledTimes(10);
    expect(httpGet).toHaveBeenCalledWith(
      'https://api.openaq.org/v3/locations',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': expect.anything() }) }),
    );
  });
});
