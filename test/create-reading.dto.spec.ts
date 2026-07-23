import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAirQualityDto } from '../src/air-quality/dto/create-reading.dto.js';

describe('CreateAirQualityDto', () => {
  it('accepts an empty body (every pollutant optional)', async () => {
    const dto = plainToInstance(CreateAirQualityDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects a non-numeric pollutant value', async () => {
    const dto = plainToInstance(CreateAirQualityDto, { pm25: 'banana' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pm25')).toBe(true);
  });

  it('rejects an implausible sensor value', async () => {
    const dto = plainToInstance(CreateAirQualityDto, { pm25: 99999 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pm25')).toBe(true);
  });
});
