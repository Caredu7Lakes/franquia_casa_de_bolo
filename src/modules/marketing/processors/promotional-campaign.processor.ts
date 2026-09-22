import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { Logger } from '@nestjs/common';

interface CampaignJobData {
  phone: string;
  couponCode: string;
  discountPercent: number;
}

@Processor('marketing-campaign')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);
  private readonly baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private readonly apiKey = process.env.EVOLUTION_API_KEY || '';
  private readonly instance = process.env.EVOLUTION_INSTANCE_NAME || '';

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { phone, couponCode, discountPercent } = job.data;

    // Evolution não usa templates da Meta: montamos texto livre.
    const text =
      `🍰 *Promoção da semana — Casa do Bolo!*\n\n` +
      `Você ganhou *${discountPercent}% de desconto*!\n` +
      `Use o cupom *${couponCode}* no seu próximo pedido. 🎉`;

    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        { number: phone, text },
        { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Promoção enviada para: ${phone}`);
    } catch (error: any) {
      this.logger.error(`Falha ao enviar promoção para ${phone}`, error.response?.data || error.message);
      throw error;
    }
  }
}