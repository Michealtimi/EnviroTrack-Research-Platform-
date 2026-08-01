import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function isAdminRequest(headers: Record<string, unknown>, configService: ConfigService): boolean {
  const expectedKey = configService.get<string>('ADMIN_API_KEY');
  if (!expectedKey) return false;
  return headers['x-api-key'] === expectedKey;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expectedKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('Admin API key is not configured on the server.');
    }
    if (!isAdminRequest(request.headers, this.configService)) {
      throw new UnauthorizedException('Invalid or missing API key.');
    }
    return true;
  }
}
