import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InteractionLog } from '../entities/interaction-log.entity';
import { WhatsappEncomenda } from '../entities/whatsapp-encomenda.entity';
import { OperationalNoticesService } from '../../operational-notices/operational-notices.service';
import { BotSessionService, EncomendaDraft } from '../session/bot-session.service';

const TZ = 'America/Sao_Paulo';

// Parceiros de delivery (print 4). Keeta nao expoe link publico -> instrucao textual.
const IFOOD_URL =
  'https://www.ifood.com.br/delivery/sao-paulo-sp/casa-de-bolos-sao-lucas-parque-sao-lucas/b9189dac-ede3-4050-ba41-eb3e7954d790';
const NOVENTA_E_NOVE_URL = 'https://oia.99app.com/dlp9/6xt0d5?share_media=WHATSAPP';
// Folheto hospedado no S3 (opcao A). Enquanto a URL nao e setada, cai no fallback.
const CATALOG_URL = process.env.CATALOG_URL || '';

const GOOGLE_REVIEW_URL = 'https://share.google/fqp9Mnox9cwgCYNX';

/**
 * Mensagens exatamente no conteudo enviado pelo cliente (10 cards). Numeracao
 * entre colchetes = numero do card de referencia.
 */
const MSG = {
  // [1] Boas-vindas (ja contem o menu de 5 opcoes).
  welcome: (nome: string) =>
    `🏠 Olá, ${nome}! Seja muito bem-vindo(a) à *Casa de Bolos Parque São Lucas*! 💛\n\n` +
    `Que alegria ter você por aqui!\n` +
    `Nossos bolos são preparados diariamente, com aquele gostinho especial de receita caseira. 🍰\n\n` +
    `Como podemos adoçar seu dia? Digite o número da opção desejada:\n\n` +
    `1️⃣ Ver nosso cardápio\n` +
    `2️⃣ Fazer uma encomenda\n` +
    `3️⃣ Consultar bolos disponíveis\n` +
    `4️⃣ Horários e localização\n` +
    `5️⃣ Falar com nossa equipe\n\n` +
    `💛 Será um prazer atender você!`,

  // Menu reexibido (sem a saudacao de boas-vindas), para recorrentes / volta ao menu.
  menu:
    `Como podemos adoçar seu dia? 🍰\nDigite o número da opção desejada:\n\n` +
    `1️⃣ Ver nosso cardápio\n` +
    `2️⃣ Fazer uma encomenda\n` +
    `3️⃣ Consultar bolos disponíveis\n` +
    `4️⃣ Horários e localização\n` +
    `5️⃣ Falar com nossa equipe`,

  // [2] Cardapio.
  cardapio: () =>
    `🍰 Temos várias delícias esperando por você!\n\n` +
    `Nosso cardápio conta com bolos tradicionais, especiais, recheados e muitas outras opções para adoçar seu dia. 💛\n\n` +
    (CATALOG_URL
      ? `📋 Confira nosso cardápio:\n${CATALOG_URL}\n\n`
      : `📋 Nosso cardápio completo estará disponível por aqui em breve.\n\n`) +
    `*Importante:* a disponibilidade dos sabores pode variar ao longo do dia.\n` +
    `Para consultar os bolos disponíveis para entrega, acesse nossos aplicativos parceiros.`,

  // [3] Encomenda — abertura (os campos sao coletados um a um a seguir).
  encomendaIntro:
    `👩‍🍳 Vamos preparar algo especial para você!\n\n` +
    `Para solicitar sua encomenda, vou te perguntar alguns detalhes.\n` +
    `Nossa equipe verificará a disponibilidade e confirmará seu pedido.\n\n` +
    `💛 A reserva é confirmada após o pagamento de *50% de sinal via Pix*.`,

  // [4] Consultar bolos disponiveis.
  disponiveis:
    `🍰 Procurando seu bolo favorito?\n\n` +
    `Nossos bolos são preparados fresquinhos ao longo do dia! 💛\n\n` +
    `Para consultar os sabores disponíveis em tempo real, acesse nossos parceiros:\n\n` +
    `🛵 *iFood:*\n${IFOOD_URL}\n\n` +
    `🛵 *99Food:*\n${NOVENTA_E_NOVE_URL}\n\n` +
    `🛵 *Keeta:* procure por *Casa de Bolos São Lucas*.\n\n` +
    `Você também pode visitar nossa loja e escolher pessoalmente entre as delícias disponíveis! 🏠`,

  // [5] Horarios.
  horarios:
    `🕐 *Nosso horário de funcionamento*\n\n` +
    `🍰 Segunda a sexta: 8h30 às 19h\n` +
    `🍰 Sábado: 8h às 17h\n` +
    `🍰 Domingos e feriados: fechado\n\n` +
    `Esperamos sua visita na *Casa de Bolos Parque São Lucas*! 💛`,

  // [6] Sabado apos 12h (bloqueia encomenda pelo WhatsApp).
  sabado:
    `💛 Aos sábados, nossa loja fica ainda mais movimentada!\n\n` +
    `Para garantir um atendimento ágil e organizado, priorizamos os clientes que estão presencialmente na loja.\n\n` +
    `🕐 Nosso atendimento de encomendas pelo WhatsApp acontece até às *12h*.\n\n` +
    `Após esse horário, você pode consultar os bolos disponíveis pelo iFood, 99Food ou Keeta.\n\n` +
    `🙏 Agradecemos muito sua compreensão e preferência!`,

  // [8] Fora do horario de atendimento.
  foraHorario:
    `🌙 Olá! Que bom receber sua mensagem!\n\n` +
    `No momento, nossa equipe está fora do horário de atendimento.\n\n` +
    `🕐 Segunda a sexta: 8h30 às 19h\n` +
    `🕐 Sábado: 8h às 17h\n` +
    `Domingos e feriados estamos fechados.\n\n` +
    `💬 Você pode deixar sua mensagem e responderemos assim que possível, durante nosso horário de atendimento.\n\n` +
    `💛 Obrigado pelo carinho!`,

  // [9] Falar com a equipe / atendimento ocupado -> entra em handoff.
  humano:
    `💛 Sua mensagem é muito importante para nós!\n\n` +
    `Nossa equipe está atendendo outros clientes neste momento.\n` +
    `Assim que possível, retornaremos seu contato.\n\n` +
    `Se deseja consultar os bolos disponíveis, você também pode acessar o iFood, 99Food ou Keeta.\n\n` +
    `🙏 Agradecemos sua paciência e compreensão!`,
};

/**
 * Convite de opt-in (LGPD). O conteudo dos 10 cards nao traz consentimento, mas
 * ele e exigencia legal ja construida no projeto; aqui entra de forma
 * NAO-BLOQUEANTE: vem depois das boas-vindas e nunca trava o menu.
 */
const OPTIN_INVITE =
  `Antes de começar: você gostaria de receber nossas *ofertas e novidades* por aqui? ` +
  `Responda *SIM* ou *NÃO*. 💌\n` +
  `(Usamos seus dados apenas para te atender; você pode pedir para ver ou apagar seus dados quando quiser.)`;

@Injectable()
export class WhatsAppBotService {
  private readonly logger = new Logger(WhatsAppBotService.name);
  private readonly baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private readonly apiKey = process.env.EVOLUTION_API_KEY || '';

  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(InteractionLog) private readonly logRepo: Repository<InteractionLog>,
    @InjectRepository(WhatsappEncomenda) private readonly encRepo: Repository<WhatsappEncomenda>,
    private readonly noticesService: OperationalNoticesService,
    private readonly session: BotSessionService,
  ) {}

  async processMessage(body: any): Promise<void> {
    const message = body?.data;
    if (!message) return;

    const rawJid: string = message.key?.remoteJid || '';
    if (!rawJid || rawJid.endsWith('@g.us') || rawJid === 'status@broadcast') return;

    const from = rawJid.split('@')[0];
    const instance: string = body?.instance;
    const msgId: string | undefined = message.key?.id;

    // Mensagem OUTBOUND (fromMe): eco do proprio bot (ignora) ou do atendente.
    if (message.key?.fromMe) {
      if (await this.session.wasBotMsg(instance, from, msgId)) return;
      if (await this.session.isHandoff(instance, from)) {
        await this.session.clearHandoff(instance, from);
        this.logger.log(`Handoff encerrado pelo atendente para ${from}; bot retomado.`);
      }
      return;
    }

    // Cliente em handoff: bot pausado — nao responde ate o atendente agir.
    if (await this.session.isHandoff(instance, from)) return;

    const name = message.pushName || 'Cliente';
    const text = this.extractText(message);
    const normalized = text.trim().toLowerCase();
    const { customer, isNew } = await this.findOrCreateCustomer(from, name);

    // Fora do horario de atendimento -> card [8] e para.
    if (!this.isOpenNow()) {
      await this.logInteraction(customer, 'FORA_HORARIO', text);
      return this.sendText(instance, from, MSG.foraHorario);
    }

    // Comandos globais: voltar ao menu / cancelar encomenda em curso.
    if (['menu', '0', 'cancelar', 'cancela', 'voltar'].includes(normalized)) {
      await this.session.clearDraft(instance, from);
      await this.logInteraction(customer, 'MENU', text);
      return this.sendText(instance, from, MSG.menu);
    }

    // Encomenda em andamento tem prioridade sobre o menu.
    const draft = await this.session.getDraft(instance, from);
    if (draft) {
      return this.handleEncomendaStep(instance, from, customer, text, draft);
    }

    const awaitingOptIn = customer.opt_in_updated_at == null;

    // Opt-in: so capturado quando o cliente ainda nao respondeu.
    if (awaitingOptIn && normalized === 'sim') {
      await this.saveOptIn(customer, true);
      await this.logInteraction(customer, 'OPTIN_SIM', text);
      await this.sendText(instance, from, 'Perfeito! 🎉 Você vai receber nossas ofertas e novidades.');
      return this.sendText(instance, from, MSG.menu);
    }
    if (awaitingOptIn && (normalized === 'não' || normalized === 'nao')) {
      await this.saveOptIn(customer, false);
      await this.logInteraction(customer, 'OPTIN_NAO', text);
      await this.sendText(instance, from, 'Tudo bem, sem ofertas! 🍰 Vamos ao que interessa:');
      return this.sendText(instance, from, MSG.menu);
    }

    // Primeiro contato: boas-vindas [1] + avisos ativos + convite opt-in (nao bloqueia).
    if (isNew) {
      await this.logInteraction(customer, 'WELCOME', text);
      await this.sendActiveNotices(instance, from);
      await this.sendText(instance, from, MSG.welcome(this.firstName(customer)));
      return this.sendText(instance, from, OPTIN_INVITE);
    }

    // Selecao do menu (5 opcoes dos cards).
    switch (normalized) {
      case '1':
        await this.logInteraction(customer, 'CARDAPIO', text);
        return this.sendText(instance, from, MSG.cardapio());
      case '2':
        return this.startEncomenda(instance, from, customer, text);
      case '3':
        await this.logInteraction(customer, 'DISPONIVEIS', text);
        return this.sendText(instance, from, MSG.disponiveis);
      case '4':
        await this.logInteraction(customer, 'HORARIOS', text);
        return this.sendText(instance, from, MSG.horarios);
      case '5':
        await this.logInteraction(customer, 'HUMANO', text);
        await this.session.setHandoff(instance, from);
        return this.sendText(instance, from, MSG.humano);
    }

    // Entrada nao reconhecida: reexibe o menu. Reconvida opt-in uma unica vez.
    await this.logInteraction(customer, 'MENU', text);
    await this.sendActiveNotices(instance, from);
    await this.sendText(instance, from, MSG.menu);
    if (awaitingOptIn) {
      const alreadyAsked = await this.logRepo.count({
        where: { customer: { id: customer.id }, menuOption: 'OPTIN_REASK' },
      });
      if (alreadyAsked === 0) {
        await this.logInteraction(customer, 'OPTIN_REASK', text);
        await this.sendText(instance, from, OPTIN_INVITE);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Encomenda (maquina de estados: flavor -> date -> time -> name)
  // ---------------------------------------------------------------------------

  private async startEncomenda(instance: string, from: string, customer: Customer, text: string): Promise<void> {
    // Regra do sabado [6]: encomenda pelo WhatsApp so ate 12h.
    const now = this.spNow();
    if (now.dow === 6 && now.minutes >= 12 * 60) {
      await this.logInteraction(customer, 'ENCOMENDA_SABADO_BLOQUEADA', text);
      return this.sendText(instance, from, MSG.sabado);
    }
    await this.logInteraction(customer, 'ENCOMENDA_INICIO', text);
    await this.session.setDraft(instance, from, { step: 'flavor' });
    await this.sendText(instance, from, MSG.encomendaIntro);
    await this.sendText(instance, from, '🍰 Qual o *sabor do bolo* que você deseja?');
  }

  private async handleEncomendaStep(
    instance: string,
    from: string,
    customer: Customer,
    text: string,
    draft: EncomendaDraft,
  ): Promise<void> {
    const value = text.trim();

    switch (draft.step) {
      case 'flavor': {
        if (value.length < 2) {
          return this.sendText(instance, from, 'Não entendi o sabor. 🍰 Digite o *sabor do bolo* desejado.');
        }
        draft.flavor = value.slice(0, 250);
        draft.step = 'date';
        await this.session.setDraft(instance, from, draft);
        return this.sendText(
          instance, from,
          '📅 Para quando você quer a *retirada*? Informe a data no formato *DD/MM* (ex.: 20/11).',
        );
      }

      case 'date': {
        const parsed = this.parseDate(value);
        if (!parsed) {
          return this.sendText(instance, from, 'Data inválida. 📅 Use o formato *DD/MM* (ex.: 20/11).');
        }
        if (parsed.iso < this.spNow().iso) {
          return this.sendText(instance, from, 'Essa data já passou. 📅 Informe uma data futura (*DD/MM*).');
        }
        if (this.windowFor(parsed.dow) === null) {
          return this.sendText(
            instance, from,
            'Aos *domingos e feriados* não há retirada. 📅 Escolha outra data (*DD/MM*).',
          );
        }
        draft.pickup_date = parsed.iso;
        draft.step = 'time';
        await this.session.setDraft(instance, from, draft);
        const w = this.windowFor(parsed.dow)!;
        return this.sendText(
          instance, from,
          `🕐 Qual o *horário* desejado para a retirada? Informe no formato *HH:MM* ` +
            `(ex.: 15:30). Funcionamento nesse dia: ${this.fmtMin(w.open)}–${this.fmtMin(w.close)}.`,
        );
      }

      case 'time': {
        const minutes = this.parseTime(value);
        if (minutes === null) {
          return this.sendText(instance, from, 'Horário inválido. 🕐 Use o formato *HH:MM* (ex.: 15:30).');
        }
        const dow = this.dowOfIso(draft.pickup_date!);
        const w = this.windowFor(dow)!; // ja validado no passo anterior
        if (minutes < w.open || minutes > w.close) {
          return this.sendText(
            instance, from,
            `Esse horário está fora do funcionamento (${this.fmtMin(w.open)}–${this.fmtMin(w.close)}). 🕐 Informe outro (*HH:MM*).`,
          );
        }
        draft.pickup_time = this.fmtMin(minutes);
        draft.step = 'name';
        await this.session.setDraft(instance, from, draft);
        return this.sendText(instance, from, '👤 Por fim, qual o *nome* para a encomenda?');
      }

      case 'name': {
        if (value.length < 2) {
          return this.sendText(instance, from, 'Não entendi o nome. 👤 Digite o *nome* para a encomenda.');
        }
        const nome = value.slice(0, 250);
        await this.saveEncomenda(customer, nome, draft);
        await this.session.clearDraft(instance, from);
        await this.logInteraction(customer, 'ENCOMENDA_REGISTRADA', `${draft.flavor} | ${draft.pickup_date} ${draft.pickup_time}`);
        return this.sendText(
          instance, from,
          `✅ Recebemos sua solicitação de encomenda!\n\n` +
            `🍰 Sabor: ${draft.flavor}\n` +
            `📅 Data: ${this.isoToBr(draft.pickup_date!)}\n` +
            `🕐 Horário: ${draft.pickup_time}\n` +
            `👤 Nome: ${nome}\n\n` +
            `💛 Nossa equipe vai *verificar a disponibilidade* e confirmar seu pedido.\n` +
            `A reserva é confirmada após o pagamento de *50% de sinal via Pix*.\n\n` +
            `Agradecemos sua preferência!`,
        );
      }
    }
  }

  private async saveEncomenda(customer: Customer, nome: string, draft: EncomendaDraft): Promise<void> {
    const enc = this.encRepo.create({
      customer,
      customer_name: nome,
      flavor: draft.flavor!,
      pickup_date: draft.pickup_date!,
      pickup_time: draft.pickup_time!,
      status: 'pending',
    });
    // tenant_id preenchido pelo DEFAULT (app.current_tenant) sob RLS.
    await this.encRepo.save(enc);
  }

  // ---------------------------------------------------------------------------
  // Avisos operacionais / helpers de mensagem
  // ---------------------------------------------------------------------------

  private async sendActiveNotices(instance: string, to: string): Promise<void> {
    const notices = await this.noticesService.findActiveNow();
    for (const notice of notices) {
      await this.sendText(instance, to, `📣 ${notice.message}`);
    }
  }

  private async sendText(instance: string, to: string, text: string): Promise<void> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/message/sendText/${instance}`,
        { number: to, text, delay: 1000 },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
      // Marca o id para distinguir o eco fromMe do bot da resposta do atendente.
      await this.session.rememberBotMsg(instance, to, res.data?.key?.id);
    } catch (error: any) {
      this.logger.error('Erro no sendText', error.response?.data || error.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Data/hora (fuso America/Sao_Paulo) — validacao robusta, sem string arbitraria
  // ---------------------------------------------------------------------------

  /** Janela de funcionamento por dia da semana (0=Dom..6=Sab), em minutos. */
  private windowFor(dow: number): { open: number; close: number } | null {
    if (dow === 0) return null; // domingo fechado
    if (dow === 6) return { open: 8 * 60, close: 17 * 60 }; // sabado 8h-17h
    return { open: 8 * 60 + 30, close: 19 * 60 }; // seg-sex 8h30-19h
  }

  private isOpenNow(): boolean {
    const { dow, minutes } = this.spNow();
    const w = this.windowFor(dow);
    return w !== null && minutes >= w.open && minutes <= w.close;
  }

  /** Agora em Sao Paulo: data ISO (yyyy-mm-dd), dia da semana e minutos do dia. */
  private spNow(): { iso: string; dow: number; minutes: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const y = get('year'), mo = get('month'), d = get('day');
    const h = parseInt(get('hour'), 10) % 24;
    const mi = parseInt(get('minute'), 10);
    const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { iso: `${y}-${mo}-${d}`, dow: wd[get('weekday')] ?? 0, minutes: h * 60 + mi };
  }

  /** dd/mm[/yyyy] -> { iso, dow }. Ano omitido = ano corrente (ou proximo se ja passou). */
  private parseDate(input: string): { iso: string; dow: number } | null {
    const m = input.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

    const now = this.spNow();
    const curYear = parseInt(now.iso.slice(0, 4), 10);
    let year: number;
    if (m[3]) {
      year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
    } else {
      year = curYear;
    }

    // Valida existencia real da data (ex.: rejeita 31/02).
    const dt = new Date(Date.UTC(year, mo - 1, d));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;

    const iso = `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // Ano omitido e data ja passou neste ano -> assume proximo ano.
    if (!m[3] && iso < now.iso) {
      return this.parseDate(`${d}/${mo}/${year + 1}`);
    }
    return { iso, dow: dt.getUTCDay() };
  }

  /** HH:mm | HHhmm | HHh | HH -> minutos do dia, ou null. */
  private parseTime(input: string): number | null {
    const m = input.trim().match(/^(\d{1,2})(?:[:h\s]?(\d{2}))?\s*h?$/i);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mi = m[2] ? parseInt(m[2], 10) : 0;
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  private dowOfIso(iso: string): number {
    const [y, mo, d] = iso.split('-').map((n) => parseInt(n, 10));
    return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  }

  private fmtMin(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private isoToBr(iso: string): string {
    const [y, mo, d] = iso.split('-');
    return `${d}/${mo}/${y}`;
  }

  // ---------------------------------------------------------------------------
  // Persistencia / util
  // ---------------------------------------------------------------------------

  private firstName(customer: Customer): string {
    return (customer.name || 'tudo bem').split(' ')[0];
  }

  private async findOrCreateCustomer(phone: string, name: string): Promise<{ customer: Customer; isNew: boolean }> {
    // Sob RLS, a busca ja e restrita ao tenant atual automaticamente.
    let customer = await this.customerRepo.findOne({ where: { phone_number: phone } });
    if (customer) return { customer, isNew: false };
    customer = this.customerRepo.create({ phone_number: phone, name });
    await this.customerRepo.save(customer);
    return { customer, isNew: true };
  }

  private async saveOptIn(customer: Customer, status: boolean): Promise<void> {
    customer.opt_in_promotions = status;
    customer.opt_in_updated_at = new Date();
    await this.customerRepo.save(customer);
  }

  private async logInteraction(customer: Customer, menuOption: string, userMessage: string): Promise<void> {
    const log = this.logRepo.create({ customer, menuOption, userMessage });
    await this.logRepo.save(log);
  }

  private extractText(message: any): string {
    return (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.buttonsResponseMessage?.selectedButtonId ||
      message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ''
    );
  }
}
