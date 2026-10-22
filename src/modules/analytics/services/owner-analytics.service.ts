import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionLog } from '../../whatsapp/entities/interaction-log.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../ifood/entities/order.entity';

@Injectable()
export class OwnerAnalyticsService {
  constructor(
    @InjectRepository(InteractionLog) private logRepo: Repository<InteractionLog>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  async getMostFrequentQuestions() {
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.menuOption', 'menu_option')
      .addSelect('COUNT(log.id)', 'total_requests')
      .where('log.menuOption IS NOT NULL')
      .groupBy('log.menuOption')
      .orderBy('total_requests', 'DESC')
      .getRawMany();
  }

  async getPeakHoursAndDays() {
    return this.logRepo
      .createQueryBuilder('log')
      .select("TO_CHAR(log.created_at, 'Day')", 'day_of_week')
      .addSelect('EXTRACT(HOUR FROM log.created_at)', 'hour_of_day')
      .addSelect('COUNT(log.id)', 'interaction_count')
      .groupBy('day_of_week, hour_of_day')
      .orderBy('interaction_count', 'DESC')
      .getRawMany();
  }

  async getOptedInCustomers() {
    return this.customerRepo.find({ where: { opt_in_promotions: true } });
  }

  // Receita, nº de pedidos e ticket médio na janela (default 18 dias).
  async getSalesSummary(days = 18) {
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders_count')
      .addSelect('COALESCE(AVG(o.total), 0)', 'average_ticket')
      .where("o.ordered_at >= NOW() - (:days || ' days')::interval", { days })
      .getRawOne();
    return {
      period_days: days,
      revenue: Number(row.revenue),
      orders_count: Number(row.orders_count),
      average_ticket: Number(Number(row.average_ticket).toFixed(2)),
    };
  }

  // Vendas por canal na janela.
  async getSalesByChannel(days = 18) {
    return this.orderRepo
      .createQueryBuilder('o')
      .select("COALESCE(o.sales_channel, 'DESCONHECIDO')", 'channel')
      .addSelect('COUNT(o.id)', 'orders_count')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where("o.ordered_at >= NOW() - (:days || ' days')::interval", { days })
      .groupBy('o.sales_channel')
      .orderBy('revenue', 'DESC')
      .getRawMany();
  }

  // Clientes ativos (compraram na janela) vs. inativos.
  async getCustomerRetention(days = 18) {
    const active = await this.customerRepo
      .createQueryBuilder('c')
      .where("c.last_order_at >= NOW() - (:days || ' days')::interval", { days })
      .getCount();
    const total = await this.customerRepo.count();
    return { period_days: days, active, inactive: total - active, total };
  }

  // Top produtos vendidos: expande o jsonb items e agrupa por nome.
  // items guarda o array cru do iFood; cada elemento tem ao menos "name" e "quantity".
  async getTopProducts(days = 18, limit = 10) {
    return this.orderRepo.query(
      `
      SELECT
        item->>'name' AS product,
        SUM(COALESCE((item->>'quantity')::numeric, 1)) AS qty,
        SUM(
          COALESCE((item->>'totalPrice')::numeric,
                   (item->>'unitPrice')::numeric,
                   (item->>'price')::numeric, 0)
        ) AS revenue
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
      WHERE o.ordered_at >= NOW() - ($1 || ' days')::interval
        AND o.items IS NOT NULL
        AND jsonb_typeof(o.items) = 'array'
      GROUP BY item->>'name'
      ORDER BY qty DESC
      LIMIT $2
      `,
      [days, limit],
    );
  }
}