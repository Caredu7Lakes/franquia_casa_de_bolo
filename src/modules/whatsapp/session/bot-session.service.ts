import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

export type EncomendaStep = 'flavor' | 'date' | 'time' | 'name';

export interface EncomendaDraft {
  step: EncomendaStep;
  flavor?: string;
  pickup_date?: string; // yyyy-mm-dd
  pickup_time?: string; // HH:mm
}

const SESSION_TTL = 20 * 60; // 20 min de inatividade -> rascunho expira
const HANDOFF_TTL = 24 * 60 * 60; // pausa expira em 24h (fallback de seguranca)
const BOTMSG_TTL = 5 * 60; // janela para reconhecer ecos fromMe do proprio bot

/**
 * Estado conversacional por contato, no Redis. Chaveado por instancia (1:1 com
 * o tenant) + telefone — evita consultar o tenant a cada mensagem.
 *   - draft:   rascunho da encomenda em andamento (maquina de estados).
 *   - handoff: bot pausado; atendente assumiu.
 *   - botmsg:  ids das mensagens que o PROPRIO bot enviou, para distinguir o
 *              eco fromMe do bot (ignorar) da resposta do atendente (destravar).
 */
@Injectable()
export class BotSessionService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private draftKey(inst: string, phone: string) {
    return `cdb:draft:${inst}:${phone}`;
  }
  private handoffKey(inst: string, phone: string) {
    return `cdb:handoff:${inst}:${phone}`;
  }
  private botMsgKey(inst: string, phone: string) {
    return `cdb:botmsg:${inst}:${phone}`;
  }

  // --- rascunho de encomenda ---
  async getDraft(inst: string, phone: string): Promise<EncomendaDraft | null> {
    const raw = await this.redis.get(this.draftKey(inst, phone));
    return raw ? (JSON.parse(raw) as EncomendaDraft) : null;
  }
  async setDraft(inst: string, phone: string, draft: EncomendaDraft): Promise<void> {
    await this.redis.set(this.draftKey(inst, phone), JSON.stringify(draft), 'EX', SESSION_TTL);
  }
  async clearDraft(inst: string, phone: string): Promise<void> {
    await this.redis.del(this.draftKey(inst, phone));
  }

  // --- handoff (pausa do bot) ---
  async setHandoff(inst: string, phone: string): Promise<void> {
    await this.redis.set(this.handoffKey(inst, phone), '1', 'EX', HANDOFF_TTL);
  }
  async isHandoff(inst: string, phone: string): Promise<boolean> {
    return (await this.redis.exists(this.handoffKey(inst, phone))) === 1;
  }
  async clearHandoff(inst: string, phone: string): Promise<void> {
    await this.redis.del(this.handoffKey(inst, phone));
  }

  // --- ecos fromMe ---
  async rememberBotMsg(inst: string, phone: string, id?: string): Promise<void> {
    if (!id) return;
    const key = this.botMsgKey(inst, phone);
    await this.redis.sadd(key, id);
    await this.redis.expire(key, BOTMSG_TTL);
  }
  async wasBotMsg(inst: string, phone: string, id?: string): Promise<boolean> {
    if (!id) return false;
    return (await this.redis.sismember(this.botMsgKey(inst, phone), id)) === 1;
  }
}
