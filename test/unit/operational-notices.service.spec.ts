import 'reflect-metadata';
import { OperationalNoticesService } from '../../src/modules/operational-notices/operational-notices.service';

function makeService(actives: any[] = []) {
  const noticeRepo = {
    find: jest.fn().mockResolvedValue(actives),
    findOne: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => d),
    remove: jest.fn(),
  };
  const service = new OperationalNoticesService(noticeRepo as any);
  return { service, noticeRepo };
}

describe('OperationalNoticesService.matches', () => {
  const { service } = makeService();

  it('sem restrição de dia/horário: sempre casa', () => {
    const n: any = { weekdays: [], start_time: null, end_time: null };
    expect(service.matches(n, 3, '12:00')).toBe(true);
  });

  it('restrição de dia: casa só no dia certo', () => {
    const n: any = { weekdays: [6], start_time: null, end_time: null }; // sábado
    expect(service.matches(n, 6, '10:00')).toBe(true);
    expect(service.matches(n, 2, '10:00')).toBe(false);
  });

  it('janela de horário: dentro casa, fora não', () => {
    const n: any = { weekdays: [], start_time: '17:00', end_time: '23:59' };
    expect(service.matches(n, 1, '17:00')).toBe(true);  // borda inicial
    expect(service.matches(n, 1, '18:30')).toBe(true);
    expect(service.matches(n, 1, '23:59')).toBe(true);  // borda final
    expect(service.matches(n, 1, '16:59')).toBe(false);
    expect(service.matches(n, 1, '09:00')).toBe(false);
  });

  it('dia + horário combinados', () => {
    const n: any = { weekdays: [6], start_time: '14:00', end_time: '19:00' };
    expect(service.matches(n, 6, '15:00')).toBe(true);
    expect(service.matches(n, 6, '20:00')).toBe(false); // dia certo, hora fora
    expect(service.matches(n, 5, '15:00')).toBe(false); // hora certa, dia errado
  });
});

describe('OperationalNoticesService.findActiveNow', () => {
  it('só retorna ativos cuja janela bate com agora (filtra pelo matches)', async () => {
    const sempre = { id: 'a', message: 'sempre', weekdays: [], start_time: null, end_time: null };
    const impossivel = { id: 'b', message: 'nunca', weekdays: [], start_time: '99:99', end_time: '99:99' };
    const { service } = makeService([sempre, impossivel]);
    const res = await service.findActiveNow(new Date());
    expect(res.map((n) => n.id)).toContain('a');
    expect(res.map((n) => n.id)).not.toContain('b');
  });
});
