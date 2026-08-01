import { ConfigService } from '@nestjs/config';
import { isAdminRequest } from '../src/common/guards/api-key.guard.js';

describe('isAdminRequest', () => {
  it('returns true when the header matches ADMIN_API_KEY', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    expect(isAdminRequest({ 'x-api-key': 'secret' }, configService)).toBe(true);
  });

  it('returns false when the header is missing or wrong', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    expect(isAdminRequest({}, configService)).toBe(false);
    expect(isAdminRequest({ 'x-api-key': 'wrong' }, configService)).toBe(false);
  });

  it('returns false when ADMIN_API_KEY is not configured', () => {
    const configService = { get: () => undefined } as unknown as ConfigService;
    expect(isAdminRequest({ 'x-api-key': 'anything' }, configService)).toBe(false);
  });
});
