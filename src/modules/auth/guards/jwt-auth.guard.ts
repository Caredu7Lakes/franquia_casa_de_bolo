import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const result = super.handleRequest(err, user, info, context);
    // Copia o tenant_id do token para req.tenantId — ponte para o TenantInterceptor.
    const req = context.switchToHttp().getRequest();
    if (result?.tenant_id) {
      req.tenantId = result.tenant_id;
    }
    return result;
  }
}