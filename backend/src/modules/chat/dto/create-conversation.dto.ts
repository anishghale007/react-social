import { IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  recipientId: string; // 1-to-1 chat for now; group chat is a schema-ready future extension
}