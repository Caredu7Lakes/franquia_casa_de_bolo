import 'reflect-metadata';

// axios é usado para falar com a Evolution (sendText/sendMedia). Mockamos para
// não fazer rede e poder inspecionar as chamadas.
jest.mock('axios');
import axios from 'axios';

import { WhatsAppBotService } from '../../src/modules/whatsapp/services/whatsapp-bot.service';
import { ProductCategory } from '../../src/modules/products/entities/product.entity';

const mockedAxios = axios as jest.Mocked<typeof axios>;

type Mocked = {
  service: WhatsAppBotService;
  customerRepo: any;
  logRepo: any;
  productsService: any;
  customer: any;
};

function makeService(existingCustomer: any = undefined): Mocked {
  const customer =
    existingCustomer === undefined
      ? { id: 'c1', phone_number: '5511999999999', name: 'Teste', opt_in_promotions: false }
      : existingCustomer;

  const customerRepo = {
    findOne: jest.fn().mockResolvedValue(customer),
    create: jest.fn((d: any) => ({ id: 'novo', ...d })),
    save: jest.fn(async (d: any) => d),
  };
  const logRepo = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => d),
  };
  const productsService = {
    findAvailableByCategory: jest.fn().mockResolvedValue([]),
  };

  const service = new WhatsAppBotService(
    customerRepo as any,
    logRepo as any,
    productsService as any,
  );
  return { service, customerRepo, logRepo, productsService, customer };
}

function body(text: string, opts: { fromMe?: boolean; jid?: string } = {}) {
  return {
    instance: 'casa_do_bolo_instance',
    data: {
      key: {
        remoteJid: opts.jid ?? '5511999999999@s.whatsapp.net',
        fromMe: opts.fromMe ?? false,
      },
      pushName: 'Teste',
      message: { conversation: text },
    },
  };
}

describe('WhatsAppBotService.processMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: {} } as any);
  });

  it('ignora mensagens enviadas pelo próprio bot (fromMe)', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('1', { fromMe: true }));
    expect(logRepo.save).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('ignora mensagens de grupo (@g.us) e status@broadcast', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('1', { jid: '123@g.us' }));
    await service.processMessage(body('1', { jid: 'status@broadcast' }));
    expect(logRepo.save).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('opção numérica "1" registra CAT_BOLOS e busca produtos da categoria', async () => {
    const { service, logRepo, productsService } = makeService();
    await service.processMessage(body('1'));

    expect(logRepo.save).toHaveBeenCalledTimes(1);
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: `CAT_${ProductCategory.BOLOS}` }),
    );
    expect(productsService.findAvailableByCategory).toHaveBeenCalledWith(ProductCategory.BOLOS);
  });

  it('"sim" grava opt-in positivo e registra OPTIN_SIM', async () => {
    const { service, customerRepo, logRepo, customer } = makeService();
    await service.processMessage(body('sim'));

    expect(customer.opt_in_promotions).toBe(true);
    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ opt_in_promotions: true }),
    );
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'OPTIN_SIM' }),
    );
  });

  it('"nao" grava opt-in negativo e registra OPTIN_NAO', async () => {
    const { service, customerRepo, logRepo, customer } = makeService();
    await service.processMessage(body('nao'));

    expect(customer.opt_in_promotions).toBe(false);
    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ opt_in_promotions: false }),
    );
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'OPTIN_NAO' }),
    );
  });

  it('"P" registra PEDIDOS e envia os links de parceiros', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('P'));

    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'PEDIDOS' }),
    );
    expect(mockedAxios.post).toHaveBeenCalled();
    const sent = (mockedAxios.post.mock.calls[0][1] as any).text as string;
    expect(sent).toContain('ifood.com.br');
  });

  it('texto não reconhecido cai no MAIN_MENU', async () => {
    const { service, logRepo } = makeService();
    await service.processMessage(body('qualquer coisa'));

    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuOption: 'MAIN_MENU' }),
    );
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('cria o cliente quando ele ainda não existe', async () => {
    const { service, customerRepo } = makeService(null); // findOne → null
    await service.processMessage(body('qualquer'));

    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone_number: '5511999999999', name: 'Teste' }),
    );
    expect(customerRepo.save).toHaveBeenCalled();
  });

  it('não propaga erro da Evolution (sendText) — o try/catch interno protege o fluxo', async () => {
    const { service, logRepo } = makeService();
    mockedAxios.post.mockRejectedValueOnce(new Error('404 instance does not exist'));

    await expect(service.processMessage(body('P'))).resolves.toBeUndefined();
    // Mesmo com a resposta falhando, a interação foi registrada antes.
    expect(logRepo.save).toHaveBeenCalled();
  });
});
