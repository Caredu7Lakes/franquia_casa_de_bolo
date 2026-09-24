import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../tenancy/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const user = await this.userRepo.findOne({ where: { email, active: true } });
    // Compara sempre (mesmo sem user) para não vazar existência por tempo de resposta.
    const hash = user?.password_hash || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinv';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // O tenant_id vai DENTRO do token — é o que o guard usa para o RLS.
    const payload = { sub: user.id, tenant_id: user.tenant_id, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}