import { Params } from 'nestjs-pino';

/**
 * Configuração do logger estruturado (pino).
 *
 * - Produção: JSON no stdout, pronto para um agregador (CloudWatch/Loki) ler o
 *   log do container sem transformação.
 * - Desenvolvimento: pino-pretty para leitura humana.
 * - Redaction: nunca loga cabeçalhos de auth/assinatura nem o corpo das
 *   requisições (webhook traz payload de cliente e o HMAC). Só metadados.
 * - autoLogging: um log por request (método, rota, status, latência, reqId).
 */
export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:standard' } }
        : undefined,
    // Não vaza segredos nem PII nos logs de request.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.apikey',
        'req.headers["x-signature-256"]',
        'req.body',
        'res.headers["set-cookie"]',
      ],
      remove: true,
    },
    // Resumo enxuto de cada request — sem corpo, sem headers sensíveis.
    serializers: {
      req(req: any) {
        return { id: req.id, method: req.method, url: req.url };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
    // Rota de health não polui o log (healthcheck bate a cada 20s).
    autoLogging: {
      ignore: (req: any) => req.url === '/health' || req.url === '/health/ready',
    },
  },
};
