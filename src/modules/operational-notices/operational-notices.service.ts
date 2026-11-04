import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationalNotice } from './entities/operational-notice.entity';

const SP_TZ = 'America/Sao_Paulo';

@Injectable()
export class OperationalNoticesService {
  constructor(
    @InjectRepository(OperationalNotice)
    private readonly noticeRepo: Repository<OperationalNotice>,
  ) {}

  async findAll(): Promise<OperationalNotice[]> {
    return this.noticeRepo.find({ order: { created_at: 'DESC' } });
  }

  async create(data: Partial<OperationalNotice>): Promise<OperationalNotice> {
    const notice = this.noticeRepo.create({
      message: data.message,
      active: data.active ?? false,
      weekdays: data.weekdays ?? [],
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
    });
    return this.noticeRepo.save(notice);
  }

  async update(id: string, data: Partial<OperationalNotice>): Promise<OperationalNotice> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) throw new NotFoundException('Aviso não encontrado.');
    if (data.message !== undefined) notice.message = data.message;
    if (data.active !== undefined) notice.active = data.active;
    if (data.weekdays !== undefined) notice.weekdays = data.weekdays;
    if (data.start_time !== undefined) notice.start_time = data.start_time;
    if (data.end_time !== undefined) notice.end_time = data.end_time;
    return this.noticeRepo.save(notice);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) throw new NotFoundException('Aviso não encontrado.');
    await this.noticeRepo.remove(notice);
    return { deleted: true };
  }

  // Avisos ativos cuja janela (dia + horário, fuso SP) bate com AGORA.
  async findActiveNow(now: Date = new Date()): Promise<OperationalNotice[]> {
    const actives = await this.noticeRepo.find({ where: { active: true } });
    const { weekday, hhmm } = this.nowInSaoPaulo(now);
    return actives.filter((n) => this.matches(n, weekday, hhmm));
  }

  // Exposto para teste; aplica os filtros de dia e horário a um aviso.
  matches(n: OperationalNotice, weekday: number, hhmm: string): boolean {
    if (n.weekdays && n.weekdays.length > 0 && !n.weekdays.includes(weekday)) {
      return false;
    }
    if (n.start_time && hhmm < n.start_time) return false;
    if (n.end_time && hhmm > n.end_time) return false;
    return true;
  }

  // Dia da semana (0=Dom..6=Sáb) e hora "HH:MM" no fuso America/Sao_Paulo,
  // sem dependência externa — via Intl.
  private nowInSaoPaulo(now: Date): { weekday: number; hhmm: string } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SP_TZ,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
    let hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    if (hour === '24') hour = '00'; // Intl pode emitir 24 à meia-noite
    return { weekday: map[wd] ?? 0, hhmm: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` };
  }
}
