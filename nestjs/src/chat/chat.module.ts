import { Module } from '@nestjs/common';
import { RuntimeModule } from '../runtime';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkillConsentService } from './skill-consent.service';
import { SkillMatcherService } from './skill-matcher.service';
import { ConversationService } from './conversation.service';

@Module({
  imports: [RuntimeModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ConversationService,
    PrismaService,
    SkillConsentService,
    SkillMatcherService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
