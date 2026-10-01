import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Permite apenas usuários com papel OWNER. Usado nas rotas de gestão de
 * usuários — só o dono cadastra/edita contas. Depende do JwtAuthGuard ter
 * populado req.user (com role) antes.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o OWNER pode gerenciar usuários.');
    }
    return true;
  }
}
