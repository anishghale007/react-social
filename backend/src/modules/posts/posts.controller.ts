import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Posts')
@ApiBearerAuth('access-token')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.postsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed/following')
  getFollowingFeed(
    @CurrentUser() user: { id: string },
    @Query() query: PaginationQueryDto,
  ) {
    return this.postsService.findFollowingFeed(user.id, query);
  }

  @Get('search')
  searchPosts(@Query() query: SearchQueryDto) {
    if (!query.q?.trim()) {
      return {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }
    return this.postsService.searchPosts(
      query.q.trim(),
      query.page,
      query.limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.postsService.findByUser(userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.remove(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(@Param('id') postId: string, @CurrentUser() user: { id: string }) {
    return this.postsService.toggleLike(postId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/like-status')
  getLikeStatus(
    @Param('id') postId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.getLikeStatus(postId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  createComment(
    @Param('id') postId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, user.id, dto.content);
  }

  @Get(':id/comments')
  getComments(@Param('id') postId: string, @Query() query: PaginationQueryDto) {
    return this.postsService.getComments(postId, query.page, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.deleteComment(commentId, user.id);
  }
}
