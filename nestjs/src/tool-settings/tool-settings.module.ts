import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalSecretService } from './local-secret.service';
import { ToolSettingsController } from './tool-settings.controller';
import { ToolSettingsService } from './tool-settings.service';

@Module({
  controllers: [ToolSettingsController],
  providers: [PrismaService, LocalSecretService, ToolSettingsService],
  exports: [ToolSettingsService],
})
export class ToolSettingsModule {}
