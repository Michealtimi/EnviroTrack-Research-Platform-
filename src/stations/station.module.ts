import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationRepository } from './station.repository.js';
import { StationService } from './station.service.js';
import { StationController } from './station.controller.js';

@Module({
  controllers: [StationController],
  providers: [PrismaService, StationRepository, StationService],
  exports: [StationService],
})
export class StationModule {}
