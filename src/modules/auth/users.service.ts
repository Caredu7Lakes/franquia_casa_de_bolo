import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../tenancy/entities/user.entity';

type CreateInput = { email: string; password: string; name?: string; role?: UserRole };
type UpdateInput = { password?: string; name?: string; role?: UserRole; active?: boolean };

/** Visão pública do usuário — nunca expõe o password_hash. */
function toPublic(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    created_at: u.created_at,
  };
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async list(tenantId: string) {
    const users = await this.repo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
    return users.map(toPublic);
  }

  async create(tenantId: string, input: CreateInput) {
    const email = (input.email || '').trim().toLowerCase();
    if (!email || !input.password) {
      throw new BadRequestException('E-mail e senha são obrigatórios.');
    }
    if (input.password.length < 6) {
      throw new BadRequestException('A senha deve ter ao menos 6 caracteres.');
    }
    const exists = await this.repo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    const user = this.repo.create({
      email,
      password_hash: await bcrypt.hash(input.password, 10),
      name: input.name,
      role: input.role ?? UserRole.OPERATOR,
      active: true,
      tenant_id: tenantId,
    });
    return toPublic(await this.repo.save(user));
  }

  async update(tenantId: string, id: string, input: UpdateInput) {
    const user = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (input.name !== undefined) user.name = input.name;
    if (input.role !== undefined) user.role = input.role;
    if (input.active !== undefined) user.active = input.active;
    if (input.password) {
      if (input.password.length < 6) {
        throw new BadRequestException('A senha deve ter ao menos 6 caracteres.');
      }
      user.password_hash = await bcrypt.hash(input.password, 10);
    }
    return toPublic(await this.repo.save(user));
  }
}
