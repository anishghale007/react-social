import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    const fullUser = await this.usersService.findById(user.id);
    return this.usersService.sanitize(fullUser);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@CurrentUser() user: { id: string }) {
    return this.usersService.findAllExcept(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('q') q: string, @CurrentUser() user: { id: string }) {
    if (!q?.trim()) return [];
    return this.usersService.searchUsers(q.trim(), user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getProfile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.findPublicProfile(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.usersService.followUser(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.usersService.unfollowUser(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/followers')
  async followers(@Param('id') id: string) {
    return this.usersService.getFollowers(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/following')
  async followingList(@Param('id') id: string) {
    return this.usersService.getFollowing(id);
  }
}
