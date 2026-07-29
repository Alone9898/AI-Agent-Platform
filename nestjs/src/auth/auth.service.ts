import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_ADMIN = {
  username: 'admin',
  password: '123456',
  nickname: '管理员',
  role: 'admin',
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const existing = await this.prisma.user.findUnique({
      where: { username: DEFAULT_ADMIN.username },
    });

    if (!existing) {
      await this.prisma.user.create({
        data: {
          username: DEFAULT_ADMIN.username,
          passwordHash: await bcrypt.hash(DEFAULT_ADMIN.password, 10),
          nickname: DEFAULT_ADMIN.nickname,
          role: DEFAULT_ADMIN.role,
        },
      });
    }
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const safeUser = this.toSafeUser(user);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return { token, user: safeUser };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return this.toSafeUser(user);
  }

  async updateProfile(userId: number, data: { nickname?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname,
        avatar: data.avatar,
      },
    });
    return this.toSafeUser(user);
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('新密码至少 6 个字符');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      throw new BadRequestException('原密码错误');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    return { message: '密码修改成功' };
  }

  private toSafeUser(user: {
    id: number;
    username: string;
    nickname: string | null;
    role: string;
    avatar: string | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      avatar: user.avatar,
    };
  }
}
