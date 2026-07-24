import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationRepository } from './station.repository.js';
import { StationService } from './station.service.js';
import { StationController } from './station.controller.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

@Module({
  controllers: [StationController],
  providers: [PrismaService, StationRepository, StationService, ApiKeyGuard],
  exports: [StationService],
})
export class StationModule {}
