import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ChatRequest, ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { SkillConsentRequest, SkillMatchRequest } from './skill-match.types';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Get('conversations')
  listConversations(
    @Req() request: any,
    @Query('keyword') keyword?: string,
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.list(Number(request.user?.sub), {
      keyword,
      agentId: agentId ? Number(agentId) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('conversations/:id')
  getConversation(@Req() request: any, @Param('id') id: string) {
    return this.conversationService.findOne(Number(request.user?.sub), id);
  }

  @Put('conversations/:id')
  renameConversation(
    @Req() request: any,
    @Param('id') id: string,
    @Body() body: { title?: string },
  ) {
    return this.conversationService.rename(Number(request.user?.sub), id, body?.title);
  }

  @Delete('conversations/:id')
  deleteConversation(@Req() request: any, @Param('id') id: string) {
    return this.conversationService.remove(Number(request.user?.sub), id);
  }

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
