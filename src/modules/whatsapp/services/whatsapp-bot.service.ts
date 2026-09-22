import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InteractionLog } from '../entities/interaction-log.entity';
import { ProductsService } from '../../products/products.service';
import { Product, ProductCategory } from '../../products/entities/product.entity';

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

  /**
   * Ponto de entrada. Recebe o evento bruto da Evolution (messages.upsert).
   * O payload da mensagem fica em body.data.
   */
  async processMessage(body: any): Promise<void> {
    const message = body?.data;
    if (!message) return;

    // Ignora mensagens enviadas pelo próprio bot e status/grupos.
    if (message.key?.fromMe) return;
    const from: string = message.key?.remoteJid || '';
    if (!from || from.endsWith('@g.us') || from === 'status@broadcast') return;

    const name = message.pushName || 'Cliente';
    const text = this.extractText(message);

    const customer = await this.findOrCreateCustomer(from, name);

    // --- Opt-in de promoções ---
    const normalized = text.trim().toLowerCase();
    if (normalized === 'sim' || normalized.includes('promocao_sim')) {
      await this.saveOptIn(customer, true);
      await this.logInteraction(customer, 'OPTIN_SIM', text);
      return this.sendText(from, 'Perfeito! 🎉 Agora você receberá nossas ofertas e cupons exclusivos.');
    }
    if (normalized === 'não' || normalized === 'nao' || normalized.includes('promocao_nao')) {
      await this.saveOptIn(customer, false);
      await this.logInteraction(customer, 'OPTIN_NAO', text);
      return this.sendText(from, 'Tudo bem! Respeitamos sua escolha. Sempre que precisar, é só chamar! 🍰');
    }

    // --- Roteamento do menu ---
    return this.routeMenu(from, customer, normalized, text);
  }

  /**
   * Direciona conforme a opção digitada. Esta é a lógica que antes estava
   * "morta" em handleIncomingMessage e nunca era chamada.
   */
  private async routeMenu(from: string, customer: Customer, option: string, rawText: string): Promise<void> {
    switch (option) {
      case '1':
      case 'cardapio':
      case 'cardápio':
        await this.logInteraction(customer, '1_CARDAPIO', rawText);
        return this.sendCategoryMenu(from);

      case '1.1':
        await this.logInteraction(customer, '1.1_PAES_SALGADOS', rawText);
        return this.sendProductsByCategory(from, ProductCategory.BREADS_SAVORIES);

      case '1.2':
        await this.logInteraction(customer, '1.2_BOLOS_DOCES', rawText);
        return this.sendProductsByCategory(from, ProductCategory.CAKES_SWEETS);

      case '2':
      case 'pedido':
      case 'pedidos':
        await this.logInteraction(customer, '2_PEDIDOS', rawText);
        return this.sendText(
          from,
          '🛍️ *Fazer Pedido*\n\nPeça pelos nossos parceiros:\n\n• iFood: (link aqui)\n• 99Food: (link aqui)',
        );

      case '3':
      case 'duvidas':
      case 'dúvidas':
        await this.logInteraction(customer, '3_DUVIDAS', rawText);
        return this.sendFaqMenu(from);

      default:
        await this.logInteraction(customer, 'MAIN_MENU', rawText);
        return this.sendMainMenu(from);
    }
  }

  // ---------- Mensagens de menu ----------

  private async sendMainMenu(to: string): Promise<void> {
    const text =
      `🍰 *Bem-vindo à Casa do Bolo!*\n\n` +
      `Responda com o *número* da opção:\n\n` +
      `1️⃣ Cardápio do Dia 📜\n` +
      `2️⃣ Fazer Pedidos 🛍️\n` +
      `3️⃣ Dúvidas e Horários ❓`;
    await this.sendText(to, text);
  }

  private async sendCategoryMenu(to: string): Promise<void> {
    const text =
      `📜 *Cardápio*\n\nEscolha uma seção:\n\n` +
      `*1.1* — Pães e Salgados 🥐\n` +
      `*1.2* — Bolos e Doces 🎂`;
    await this.sendText(to, text);
  }

  private async sendFaqMenu(to: string): Promise<void> {
    const text =
      `❓ *Dúvidas Frequentes*\n\n` +
      `Horários: Ter a Dom, 8h–19h\n` +
      `Localização e estacionamento, frete, dietas especiais, pagamentos e encomendas — responda aqui que ajudamos.`;
    await this.sendText(to, text);
  }

  private async sendProductsByCategory(to: string, category: ProductCategory): Promise<void> {
    const products = await this.productsService.findAvailableByCategory(category);

    if (!products.length) {
      return this.sendText(to, 'No momento não há itens disponíveis nesta seção. 🙏');
    }

    for (const product of products) {
      await this.sendProductMedia(to, product);
    }
  }

  // ---------- Chamadas à Evolution API v2 ----------

  private async sendText(to: string, text: string): Promise<void> {
    const endpoint = `${this.baseUrl}/message/sendText/${this.instance}`;
    // Formato v2: number/text/delay achatados (o aninhado textMessage é v1).
    const payload = { number: to, text, delay: 1200 };
    try {
      await axios.post(endpoint, payload, {
        headers: { apikey: this.apiKey, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      this.logger.error('Erro no sendText', error.response?.data || error.message);
    }
  }

  private async sendProductMedia(to: string, product: Product): Promise<void> {
    const endpoint = `${this.baseUrl}/message/sendMedia/${this.instance}`;
    const caption = `🍰 *${product.name}*\n\n${product.description || ''}\n\n💰 *Preço:* R$ ${Number(product.price).toFixed(2)}`;
    const payload = { number: to, mediatype: 'image', media: product.imageUrl, caption };
    try {
      await axios.post(endpoint, payload, {
        headers: { apikey: this.apiKey, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      this.logger.error(`Erro no sendMedia (${product.name})`, error.response?.data || error.message);
    }
  }

  // ---------- Persistência ----------

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
    // Campos alinhados à entidade InteractionLog: menuOption + userMessage.
    const log = this.logRepo.create({ customer, menuOption, userMessage });
    await this.logRepo.save(log);
  }

  // ---------- Util ----------

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