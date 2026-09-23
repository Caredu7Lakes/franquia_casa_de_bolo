import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InteractionLog } from '../entities/interaction-log.entity';
import { ProductsService } from '../../products/products.service';
import { Product, ProductCategory } from '../../products/entities/product.entity';

// Mapa: opção digitada -> categoria + rótulo exibido no menu.
const CATEGORY_MENU: { key: string; category: ProductCategory; label: string }[] = [
  { key: '1', category: ProductCategory.BOLOS, label: 'Bolos' },
  { key: '2', category: ProductCategory.MINI_BABY, label: 'Mini e Baby' },
  { key: '3', category: ProductCategory.BITES, label: 'Bites' },
  { key: '4', category: ProductCategory.RECHEADOS, label: 'Bolos Recheados' },
  { key: '5', category: ProductCategory.CASEIRO_POTE, label: 'Bolo Caseiro no Pote' },
  { key: '6', category: ProductCategory.GELADOS, label: 'Gelados' },
  { key: '7', category: ProductCategory.CUCAS_TORTAS, label: 'Cucas e Tortas' },
  { key: '8', category: ProductCategory.COBERTURAS, label: 'Coberturas' },
  { key: '9', category: ProductCategory.ESPECIAIS, label: 'Bolos Especiais' },
  { key: '10', category: ProductCategory.ACESSORIOS, label: 'Acessórios' },
];

@Injectable()
export class WhatsAppBotService {
  private readonly logger = new Logger(WhatsAppBotService.name);
  private readonly baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private readonly apiKey = process.env.EVOLUTION_API_KEY || '';
  private readonly instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';

  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(InteractionLog) private readonly logRepo: Repository<InteractionLog>,
    private readonly productsService: ProductsService,
  ) {}

  async processMessage(body: any): Promise<void> {
    const message = body?.data;
    if (!message) return;
    if (message.key?.fromMe) return;

    const from: string = message.key?.remoteJid || '';
    if (!from || from.endsWith('@g.us') || from === 'status@broadcast') return;

    const name = message.pushName || 'Cliente';
    const text = this.extractText(message);
    const customer = await this.findOrCreateCustomer(from, name);
    const normalized = text.trim().toLowerCase();

    // Opt-in de promoções.
    if (normalized === 'sim' || normalized.includes('promocao_sim')) {
      await this.saveOptIn(customer, true);
      await this.logInteraction(customer, 'OPTIN_SIM', text);
      return this.sendText(from, 'Perfeito! 🎉 Agora você receberá nossas ofertas e cupons exclusivos.');
    }
    if (normalized === 'não' || normalized === 'nao' || normalized.includes('promocao_nao')) {
      await this.saveOptIn(customer, false);
      await this.logInteraction(customer, 'OPTIN_NAO', text);
      return this.sendText(from, 'Tudo bem! Sempre que precisar, é só chamar! 🍰');
    }

    // Menu do cardápio: opções 1..10 caem numa categoria.
    const catItem = CATEGORY_MENU.find((c) => c.key === normalized);
    if (catItem) {
      await this.logInteraction(customer, `CAT_${catItem.category}`, text);
      return this.sendProductsByCategory(from, catItem.category, catItem.label);
    }

    // Opções fixas.
    switch (normalized) {
      case 'pedido':
      case 'pedidos':
      case 'p':
        await this.logInteraction(customer, 'PEDIDOS', text);
        return this.sendText(
          from,
          '🛍️ *Fazer Pedido*\n\nPeça pelos nossos parceiros:\n\n' +
            '🔴 *iFood:*\nhttps://www.ifood.com.br/delivery/sao-paulo-sp/casa-de-bolos-sao-lucas-parque-sao-lucas/b9189dac-ede3-4050-ba41-eb3e7954d790\n\n' +
            '🟡 *99Food:*\n(link em breve)',
        );
      case 'duvidas':
      case 'dúvidas':
      case 'd':
        await this.logInteraction(customer, 'DUVIDAS', text);
        return this.sendFaqMenu(from);
      default:
        await this.logInteraction(customer, 'MAIN_MENU', text);
        return this.sendMainMenu(from);
    }
  }

  private async sendMainMenu(to: string): Promise<void> {
    const linhas = CATEGORY_MENU.map((c) => `*${c.key}* — ${c.label}`).join('\n');
    const text =
      `🍰 *Casa do Bolo* 🍰\n\n` +
      `Responda com o *número* da categoria do cardápio:\n\n` +
      `${linhas}\n\n` +
      `Ou digite:\n*P* — Fazer pedido 🛍️\n*D* — Dúvidas e horários ❓`;
    await this.sendText(to, text);
  }

  private async sendFaqMenu(to: string): Promise<void> {
    const text =
      `❓ *Dúvidas Frequentes*\n\n` +
      `Horários: Ter a Dom, 8h–19h\n` +
      `Localização, estacionamento, frete, dietas especiais, pagamentos e encomendas — responda aqui que ajudamos.`;
    await this.sendText(to, text);
  }

  private async sendProductsByCategory(to: string, category: ProductCategory, label: string): Promise<void> {
    const products = await this.productsService.findAvailableByCategory(category);
    if (!products.length) {
      return this.sendText(to, `A seção *${label}* está sem itens no momento. 🙏`);
    }
    await this.sendText(to, `📜 *${label}*`);
    for (const product of products) {
      await this.sendProductMedia(to, product);
    }
  }

  private async sendText(to: string, text: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        { number: to, text, delay: 1000 },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
    } catch (error: any) {
      this.logger.error('Erro no sendText', error.response?.data || error.message);
    }
  }

  private async sendProductMedia(to: string, product: Product): Promise<void> {
    const preco = product.price != null ? `\n💰 R$ ${Number(product.price).toFixed(2)}` : '';
    const caption = `🍰 *${product.name}*${product.description ? `\n${product.description}` : ''}${preco}`;

    // Sem foto ainda: manda só o texto, para não quebrar o sendMedia com URL vazia.
    if (!product.imageUrl) {
      return this.sendText(to, caption);
    }
    try {
      await axios.post(
        `${this.baseUrl}/message/sendMedia/${this.instance}`,
        { number: to, mediatype: 'image', media: product.imageUrl, caption },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
    } catch (error: any) {
      this.logger.error(`Erro no sendMedia (${product.name})`, error.response?.data || error.message);
    }
  }

  private async findOrCreateCustomer(phone: string, name: string): Promise<Customer> {
    let customer = await this.customerRepo.findOne({ where: { phone_number: phone } });
    if (!customer) {
      customer = this.customerRepo.create({ phone_number: phone, name });
      await this.customerRepo.save(customer);
    }
    return customer;
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