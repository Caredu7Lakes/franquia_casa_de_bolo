import { registerAs } from '@nestjs/config';

/**
 * Config da Evolution API v2 (self-hosted). Substitui a config antiga que
 * apontava para graph.facebook.com (Meta oficial), não usada neste projeto.
 */
export default registerAs('whatsapp', () => ({
  apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instance: process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance',
}));