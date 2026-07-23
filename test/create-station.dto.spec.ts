import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateStationDto } from '../src/stations/dto/create-station.dto.js';

describe('CreateStationDto', () => {
  it('rejects out-of-range latitude', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Test', city: 'X', country: 'Y', latitude: 999, longitude: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'latitude')).toBe(true);
  });

  it('accepts a valid station', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Test', city: 'X', country: 'Y', latitude: 51.5, longitude: -0.12,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
