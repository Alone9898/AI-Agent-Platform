import { Module } from '@nestjs/common';
import { RuntimeModule } from '../runtime';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RuntimeModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
