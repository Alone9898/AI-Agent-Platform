import { Body, Controller, Post, Req } from '@nestjs/common';
import { ChatRequest, ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  sendMessage(@Req() request: any, @Body() body: ChatRequest) {
    return this.chatService.sendMessage(Number(request.user?.sub), body);
  }
}
