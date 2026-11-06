import 'reflect-metadata';

// axios fala com a Evolution (sendText). Mockado para nao fazer rede.
jest.mock('axios');
import axios from 'axios';

import { WhatsAppBotService } from '../../src/modules/whatsapp/services/whatsapp-bot.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

type Mocked = {
  service: WhatsAppBotService;
  customerRepo: any;
  logRepo: any;
  encRepo: any;
  noticesService: any;
  session: any;
  customer: any;
};

// Cliente padrao JA respondeu o opt-in (opt_in_updated_at setado) — fluxo normal
// nao cai no convite/re-ask.
function makeService(existingCustomer: any = undefined): Mocked {
  const customer =
    existingCustomer === undefined
      ? {
          id: 'c1',
          phone_number: '5511999999999',
          name: 'Teste',
          opt_in_promotions: false,
          opt_in_updated_at: new Date(),
        }
      : existingCustomer;

  const customerRepo = {
    findOne: jest.fn().mockResolvedValue(customer),
    create: jest.fn((d: any) => ({ id: 'novo', ...d })),
    save: jest.fn(async (d: any) => d),
  };
  const logRepo = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => d),
    count: jest.fn().mockResolvedValue(0),
  };
  const encRepo = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => d),
  };
  const noticesService = {
    findActiveNow: jest.fn().mockResolvedValue([]),
  };
  // BotSessionService mockado: sem rascunho, sem handoff, nada e eco do bot.
  const session = {
    getDraft: jest.fn().mockResolvedValue(null),
    setDraft: jest.fn().mockResolvedValue(undefined),
    clearDraft: jest.fn().mockResolvedValue(undefined),
    isHandoff: jest.fn().mockResolvedValue(false),
    setHandoff: jest.fn().mockResolvedValue(undefined),
    clearHandoff: jest.fn().mockResolvedValue(undefined),
    rememberBotMsg: jest.fn().mockResolvedValue(undefined),
    wasBotMsg: jest.fn().mockResolvedValue(false),
  };

  const service = new WhatsAppBotService(
    customerRepo as any,
    logRepo as any,
    encRepo as any,
    noticesService as any,
    session as any,
  );
  return { service, customerRepo, logRepo, encRepo, noticesService, session, customer };
}

function body(text: string, opts: { fromMe?: boolean; jid?: string } = {}) {
  return {
    instance: 'casa_do_bolo_instance',
    data: {
      key: {
        remoteJid: opts.jid ?? '5511999999999@s.whatsapp.net',
        fromMe: opts.fromMe ?? false,
        id: 'MSG' + Math.random().toString(36).slice(2),
      },
      pushName: 'Teste',
      message: { conversation: text },
    },
  };
}

function textosEnviados(): string[] {
  return mockedAxios.post.mock.calls.map((c: any) => c[1].text as string);
}

describe('WhatsAppBotService.processMessage (v2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: { key: { id: 'out1' } } } as any);
    // Relogio fixo: sexta 2026-11-06 15:00Z = 12:00 em Sao Paulo -> horario comercial.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-06T15:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignora mensagens enviadas pelo proprio bot (fromMe)', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('1', { fromMe: true }));
    expect(logRepo.save).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('ignora grupo (@g.us) e status@broadcast', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('1', { jid: '123@g.us' }));
    await service.processMessage(body('1', { jid: 'status@broadcast' }));
    expect(logRepo.save).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('opcao "1" registra CARDAPIO e envia a mensagem do cardapio', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('1'));
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'CARDAPIO' }),
    );
    expect(textosEnviados().some((t) => t.toLowerCase().includes('cardápio'))).toBe(true);
  });

  it('opcao "3" registra DISPONIVEIS com iFood e 99Food (sem Keeta)', async () => {
    const { service } = makeService();
    await service.processMessage(body('3'));
    const t = textosEnviados().join('\n');
    expect(t).toContain('ifood.com.br');
    expect(t.toLowerCase()).toContain('99food');
    expect(t.toLowerCase()).not.toContain('keeta');
  });

  it('opcao "5" registra HUMANO e ativa o handoff (pausa)', async () => {
    const { service, logRepo, session } = makeService();
    await service.processMessage(body('5'));
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'HUMANO' }),
    );
    expect(session.setHandoff).toHaveBeenCalled();
  });

  it('cliente em handoff: bot nao responde', async () => {
    const { service, session, logRepo } = makeService();
    session.isHandoff.mockResolvedValue(true);
    await service.processMessage(body('qualquer coisa'));
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(logRepo.save).not.toHaveBeenCalled();
  });

  it('mensagem fromMe do atendente encerra o handoff', async () => {
    const { service, session } = makeService();
    session.isHandoff.mockResolvedValue(true);
    session.wasBotMsg.mockResolvedValue(false); // nao foi o bot que enviou
    await service.processMessage(body('ja te respondo', { fromMe: true }));
    expect(session.clearHandoff).toHaveBeenCalled();
  });

  it('pergunta de preco registra PRECO_CONSULTA e aponta o cardapio', async () => {
    const { service, logRepo, session } = makeService();
    await service.processMessage(body('qual o valor do bolo?'));
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'PRECO_CONSULTA' }),
    );
    expect(session.clearDraft).toHaveBeenCalled();
    expect(textosEnviados().some((t) => t.toLowerCase().includes('valores'))).toBe(true);
  });

  it('encomenda: nome incompleto e rejeitado (pede nome completo)', async () => {
    const { service, encRepo, session } = makeService();
    session.getDraft.mockResolvedValue({ step: 'name', flavor: 'Chocolate', pickup_date: '2026-11-20', pickup_time: '15:30' });
    await service.processMessage(body('Renata'));
    expect(encRepo.save).not.toHaveBeenCalled();
    expect(textosEnviados().some((t) => t.toLowerCase().includes('nome completo'))).toBe(true);
  });

  it('encomenda: nome completo persiste a encomenda e limpa o rascunho', async () => {
    const { service, encRepo, session } = makeService();
    session.getDraft.mockResolvedValue({ step: 'name', flavor: 'Chocolate', pickup_date: '2026-11-20', pickup_time: '15:30' });
    await service.processMessage(body('Renata Duarte'));
    expect(encRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Renata Duarte',
        flavor: 'Chocolate',
        pickup_date: '2026-11-20',
        pickup_time: '15:30',
        status: 'pending',
      }),
    );
    expect(encRepo.save).toHaveBeenCalled();
    expect(session.clearDraft).toHaveBeenCalled();
    expect(textosEnviados().some((t) => t.toLowerCase().includes('recebemos'))).toBe(true);
  });

  it('"sim" grava opt-in positivo quando o cliente ainda nao respondeu', async () => {
    const semOptIn = { id: 'c2', phone_number: '5511999999999', name: 'Teste', opt_in_promotions: false, opt_in_updated_at: null };
    const { service, customerRepo, logRepo } = makeService(semOptIn);
    await service.processMessage(body('sim'));
    expect(customerRepo.save).toHaveBeenCalledWith(expect.objectContaining({ opt_in_promotions: true }));
    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({ menuOption: 'OPTIN_SIM' }));
  });

  it('"nao" grava opt-in negativo quando o cliente ainda nao respondeu', async () => {
    const semOptIn = { id: 'c3', phone_number: '5511999999999', name: 'Teste', opt_in_promotions: true, opt_in_updated_at: null };
    const { service, customerRepo, logRepo } = makeService(semOptIn);
    await service.processMessage(body('nao'));
    expect(customerRepo.save).toHaveBeenCalledWith(expect.objectContaining({ opt_in_promotions: false }));
    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({ menuOption: 'OPTIN_NAO' }));
  });

  it('cliente novo recebe boas-vindas (WELCOME) e e criado', async () => {
    const { service, customerRepo, logRepo } = makeService(null); // findOne -> null
    await service.processMessage(body('oi'));
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone_number: '5511999999999', name: 'Teste' }),
    );
    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({ menuOption: 'WELCOME' }));
    expect(textosEnviados().some((t) => t.toLowerCase().includes('bem-vindo'))).toBe(true);
  });

  it('fora do horario: responde a mensagem de fora de horario e para', async () => {
    const { service } = makeService();
    jest.setSystemTime(new Date('2026-11-08T15:00:00Z')); // domingo -> fechado
    await service.processMessage(body('1'));
    expect(textosEnviados().some((t) => t.toLowerCase().includes('fora do horário'))).toBe(true);
  });

  it('nao propaga erro da Evolution (try/catch interno protege o fluxo)', async () => {
    const { service } = makeService();
    mockedAxios.post.mockRejectedValueOnce(new Error('404 instance does not exist'));
    await expect(service.processMessage(body('3'))).resolves.toBeUndefined();
  });
});
