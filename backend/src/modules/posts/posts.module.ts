import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { NotificationsModule } from '../notifcations/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
