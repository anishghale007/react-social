import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1, { message: 'Post cannot be empty' })
  @MaxLength(2000, { message: 'Post cannot exceed 2000 characters' })
  content: string;
}