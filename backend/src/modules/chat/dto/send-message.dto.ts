import { IsString, MinLength, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}