import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      client.userId = payload.sub;
      client.join(`user:${payload.sub}`);

      this.logger.log(
        `Client connected: user ${payload.sub}, socket ${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`Unauthorized connection attempt: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(
        `Client disconnected: user ${client.userId}, socket ${client.id}`,
      );
    }
  }

  private extractToken(client: Socket): string {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');
    return token;
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    await this.chatService.assertMembership(conversationId, client.userId!);
    client.join(`conversation:${conversationId}`);
    return { event: 'joinedConversation', conversationId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const message = await this.chatService.createMessage(
      dto.conversationId,
      client.userId!,
      dto.content,
    );

    this.server
      .to(`conversation:${dto.conversationId}`)
      .emit('newMessage', message);

    return { event: 'messageSent', messageId: message.id };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }
}
