import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../src/common/guards/api-key.guard.js';

function mockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  it('denies a request with no key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(() => guard.canActivate(mockContext({}))).toThrow(UnauthorizedException);
  });

  it('denies a request with the wrong key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(() => guard.canActivate(mockContext({ 'x-api-key': 'wrong' }))).toThrow(UnauthorizedException);
  });

  it('allows a request with the matching key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(guard.canActivate(mockContext({ 'x-api-key': 'secret' }))).toBe(true);
  });
});
