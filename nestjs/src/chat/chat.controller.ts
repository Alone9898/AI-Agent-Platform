import { Body, Controller, Post, Req } from '@nestjs/common';
import { ChatRequest, ChatService } from './chat.service';
import { SkillConsentRequest, SkillMatchRequest } from './skill-match.types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('match-skills')
  matchSkills(@Req() request: any, @Body() body: SkillMatchRequest) {
    return this.chatService.matchSkills(Number(request.user?.sub), body);
  }

  @Post('skill-consent')
  confirmSkills(@Req() request: any, @Body() body: SkillConsentRequest) {
    return this.chatService.confirmSkills(Number(request.user?.sub), body);
  }

  @Post()
  sendMessage(@Req() request: any, @Body() body: ChatRequest) {
    return this.chatService.sendMessage(Number(request.user?.sub), body);
  }
}
