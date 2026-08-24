import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { PaginationQueryDto } from '../posts/dto/pagination-query.dto'; // reused, already generic

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  createConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.findOrCreateConversation(user.id, dto.recipientId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: { id: string }) {
    return this.chatService.getUserConversations(user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Query() query: PaginationQueryDto,
  ) {
    return this.chatService.getMessages(
      conversationId,
      user.id,
      query.page,
      query.limit,
    );
  }

  @Post('conversations/:id/read')
  markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.chatService.markAsRead(conversationId, user.id);
  }
}
