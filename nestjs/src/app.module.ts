import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AgentModule } from './agent/agent.module';
import { SkillModule } from './skill/skill.module';
import { ModelModule } from './model/model.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [AuthModule, AgentModule, SkillModule, ModelModule, ChatModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.$connect();
    console.log('Database connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
