import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { Logger } from '@nestjs/common';

interface DispatchJobData {
  phone: string;
  messageText?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

@Processor('bulk-dispatch')
export class BulkDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkDispatchProcessor.name);
  private readonly baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private readonly apiKey = process.env.EVOLUTION_API_KEY || '';
  private readonly instance = process.env.EVOLUTION_INSTANCE_NAME || '';

  async process(job: Job<DispatchJobData>): Promise<void> {
    const { phone, messageText, mediaUrl, mediaType } = job.data;

    try {
      if (mediaUrl) {
        const mediaEndpoint = `${this.baseUrl}/message/sendMedia/${this.instance}`;
        await axios.post(
          mediaEndpoint,
          {
            number: phone,
            mediatype: mediaType || 'image',
            media: mediaUrl,
            caption: messageText || '',
          },
          { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
        );
      } else if (messageText) {
        const textEndpoint = `${this.baseUrl}/message/sendText/${this.instance}`;
        // Formato v2 achatado.
        await axios.post(
          textEndpoint,
          { number: phone, text: messageText },
          { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
        );
      }

      this.logger.log(`Mensagem disparada com sucesso para: ${phone}`);
    } catch (error: any) {
      this.logger.error(`Falha no disparo para ${phone}`, error.response?.data || error.message);
      throw error; // Permite retentativa no BullMQ.
    }
  }
}