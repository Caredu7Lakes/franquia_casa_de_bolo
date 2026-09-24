import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InteractionLog } from '../entities/interaction-log.entity';
import { ProductsService } from '../../products/products.service';
import { Product, ProductCategory } from '../../products/entities/product.entity';

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

  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(InteractionLog) private readonly logRepo: Repository<InteractionLog>,
    private readonly productsService: ProductsService,
  ) {}

  async processMessage(body: any): Promise<void> {
    const message = body?.data;
    if (!message) return;
    if (message.key?.fromMe) return;

    const rawJid: string = message.key?.remoteJid || '';
    if (!rawJid || rawJid.endsWith('@g.us') || rawJid === 'status@broadcast') return;
    const from = rawJid.split('@')[0];

    // Instância de ENVIO = a que recebeu (cada tenant tem a sua).
    const instance: string = body?.instance;
    const name = message.pushName || 'Cliente';
    const text = this.extractText(message);
    const customer = await this.findOrCreateCustomer(from, name);
    const normalized = text.trim().toLowerCase();

    if (normalized === 'sim' || normalized.includes('promocao_sim')) {
      await this.saveOptIn(customer, true);
      await this.logInteraction(customer, 'OPTIN_SIM', text);
      return this.sendText(instance, from, 'Perfeito! 🎉 Agora você receberá nossas ofertas e cupons exclusivos.');
    }
    if (normalized === 'não' || normalized === 'nao' || normalized.includes('promocao_nao')) {
      await this.saveOptIn(customer, false);
      await this.logInteraction(customer, 'OPTIN_NAO', text);
      return this.sendText(instance, from, 'Tudo bem! Sempre que precisar, é só chamar! 🍰');
    }

    const catItem = CATEGORY_MENU.find((c) => c.key === normalized);
    if (catItem) {
      await this.logInteraction(customer, `CAT_${catItem.category}`, text);
      return this.sendProductsByCategory(instance, from, catItem.category, catItem.label);
    }

    switch (normalized) {
      case 'pedido':
      case 'pedidos':
      case 'p':
        await this.logInteraction(customer, 'PEDIDOS', text);
        return this.sendText(
          instance, from,
          '🛍️ *Fazer Pedido*\n\nPeça pelos nossos parceiros:\n\n' +
            '🔴 *iFood:*\nhttps://www.ifood.com.br/delivery/sao-paulo-sp/casa-de-bolos-sao-lucas-parque-sao-lucas/b9189dac-ede3-4050-ba41-eb3e7954d790\n\n' +
            '🟡 *99Food:*\n(link em breve)',
        );
      case 'duvidas':
      case 'dúvidas':
      case 'd':
        await this.logInteraction(customer, 'DUVIDAS', text);
        return this.sendFaqMenu(instance, from);
      default:
        await this.logInteraction(customer, 'MAIN_MENU', text);
        return this.sendMainMenu(instance, from);
    }
  }

  private async sendMainMenu(instance: string, to: string): Promise<void> {
    const linhas = CATEGORY_MENU.map((c) => `*${c.key}* — ${c.label}`).join('\n');
    const text =
      `🍰 *Casa do Bolo* 🍰\n\n` +
      `Responda com o *número* da categoria do cardápio:\n\n` +
      `${linhas}\n\n` +
      `Ou digite:\n*P* — Fazer pedido 🛍️\n*D* — Dúvidas e horários ❓`;
    await this.sendText(instance, to, text);
  }

  private async sendFaqMenu(instance: string, to: string): Promise<void> {
    const text =
      `❓ *Dúvidas Frequentes*\n\n` +
      `Horários: Ter a Dom, 8h–19h\n` +
      `Localização, estacionamento, frete, dietas especiais, pagamentos e encomendas — responda aqui que ajudamos.`;
    await this.sendText(instance, to, text);
  }

  private async sendProductsByCategory(instance: string, to: string, category: ProductCategory, label: string): Promise<void> {
    const products = await this.productsService.findAvailableByCategory(category);
    if (!products.length) {
      return this.sendText(instance, to, `A seção *${label}* está sem itens no momento. 🙏`);
    }
    await this.sendText(instance, to, `📜 *${label}*`);
    for (const product of products) {
      await this.sendProductMedia(instance, to, product);
    }
  }

  private async sendText(instance: string, to: string, text: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${instance}`,
        { number: to, text, delay: 1000 },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
    } catch (error: any) {
      this.logger.error('Erro no sendText', error.response?.data || error.message);
    }
  }

  private async sendProductMedia(instance: string, to: string, product: Product): Promise<void> {
    const preco = product.price != null ? `\n💰 R$ ${Number(product.price).toFixed(2)}` : '';
    const caption = `🍰 *${product.name}*${product.description ? `\n${product.description}` : ''}${preco}`;
    if (!product.imageUrl) {
      return this.sendText(instance, to, caption);
    }
    try {
      await axios.post(
        `${this.baseUrl}/message/sendMedia/${instance}`,
        { number: to, mediatype: 'image', media: product.imageUrl, caption },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
    } catch (error: any) {
      this.logger.error(`Erro no sendMedia (${product.name})`, error.response?.data || error.message);
    }
  }

  private async findOrCreateCustomer(phone: string, name: string): Promise<Customer> {
    // Sob RLS, a busca já é restrita ao tenant atual automaticamente.
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