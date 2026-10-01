import 'reflect-metadata';
import { OwnerAnalyticsService } from '../../src/modules/analytics/services/owner-analytics.service';

function makeQueryBuilder(result: any[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

function makeService(qbResult: any[] = [], customers: any[] = []) {
  const qb = makeQueryBuilder(qbResult);
  const logRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
  const customerRepo = { find: jest.fn().mockResolvedValue(customers) };
  const service = new OwnerAnalyticsService(logRepo as any, customerRepo as any);
  return { service, logRepo, customerRepo, qb };
}

describe('OwnerAnalyticsService', () => {
  describe('getMostFrequentQuestions', () => {
    it('agrupa por menuOption, filtra nulos e retorna o agregado', async () => {
      const rows = [
        { menu_option: 'CAT_BOLOS', total_requests: '5' },
        { menu_option: 'MAIN_MENU', total_requests: '3' },
      ];
      const { service, qb } = makeService(rows);

      const result = await service.getMostFrequentQuestions();

      expect(result).toEqual(rows);
      expect(qb.select).toHaveBeenCalledWith('log.menuOption', 'menu_option');
      expect(qb.where).toHaveBeenCalledWith('log.menuOption IS NOT NULL');
      expect(qb.groupBy).toHaveBeenCalledWith('log.menuOption');
      expect(qb.orderBy).toHaveBeenCalledWith('total_requests', 'DESC');
    });
  });

  describe('getPeakHoursAndDays', () => {
    it('agrupa por dia da semana e hora e retorna a contagem', async () => {
      const rows = [{ day_of_week: 'Monday', hour_of_day: '14', interaction_count: '9' }];
      const { service, qb } = makeService(rows);

      const result = await service.getPeakHoursAndDays();

      expect(result).toEqual(rows);
      expect(qb.groupBy).toHaveBeenCalledWith('day_of_week, hour_of_day');
      expect(qb.orderBy).toHaveBeenCalledWith('interaction_count', 'DESC');
    });
  });

  describe('getOptedInCustomers', () => {
    it('retorna apenas clientes com opt-in de promoções', async () => {
      const customers = [{ id: 'c1', opt_in_promotions: true }];
      const { service, customerRepo } = makeService([], customers);

      const result = await service.getOptedInCustomers();

      expect(result).toEqual(customers);
      expect(customerRepo.find).toHaveBeenCalledWith({
        where: { opt_in_promotions: true },
      });
    });
  });
});
