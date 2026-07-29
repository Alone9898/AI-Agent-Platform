import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Public } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Put('profile')
  updateProfile(@Req() req: any, @Body() body: { nickname?: string; avatar?: string }) {
    return this.authService.updateProfile(req.user.sub, body);
  }

  @UseGuards(AuthGuard)
  @Put('password')
  changePassword(
    @Req() req: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.sub,
      body.oldPassword,
      body.newPassword,
    );
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout() {
    return { message: 'ok' };
  }
}
