import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly adminUser = process.env.ADMIN_USER || '';
  private readonly adminPassHash = process.env.ADMIN_PASSWORD_HASH || '';

  constructor(private readonly jwtService: JwtService) {}

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const userOk = username === this.adminUser;
    // Compara a senha enviada com o hash bcrypt guardado no .env.
    const passOk = this.adminPassHash
      ? await bcrypt.compare(password, this.adminPassHash)
      : false;

    if (!userOk || !passOk) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const payload = { sub: username, role: 'admin' };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}