import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { IfoodClient } from '../ifood.client';

@Injectable()
export class IfoodOrderService {
  private readonly logger = new Logger(IfoodOrderService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    private readonly ifoodClient: IfoodClient,
  ) {}

  /**
   * Processa um evento de pedido. Só nos interessa quando há detalhe de pedido
   * a puxar (ex.: PLACED/CONFIRMED). Busca o detalhe, grava o Order e atualiza
   * os campos de CRM do cliente (hábitos de compra).
   */
  async ingestOrder(ifoodOrderId: string): Promise<void> {
    // Idempotência: se já gravamos esse pedido, não repete.
    const exists = await this.orderRepo.findOne({ where: { ifood_order_id: ifoodOrderId } });
    if (exists) return;

    const details = await this.ifoodClient.getOrderDetails(ifoodOrderId);

    // Telefone do cliente: o iFood entrega um número (às vezes mascarado/localizador).
    const phone: string =
      details?.customer?.phone?.number ||
      details?.customer?.phone ||
      'ifood-sem-telefone';
    const name: string = details?.customer?.name || 'Cliente iFood';
    const total: number = Number(details?.total?.orderAmount ?? details?.totalPrice ?? 0);

    const customer = await this.findOrCreateCustomer(phone, name);
    const order = this.orderRepo.create({
      ifood_order_id: ifoodOrderId,
      display_id: details?.displayId,
      total,
      items: details?.items ?? null,
      status: details?.status ?? null,
      sales_channel: details?.salesChannel ?? 'IFOOD',
      ordered_at: details?.createdAt ? new Date(details.createdAt) : new Date(),
      customer,
    });
    await this.orderRepo.save(order);

    await this.updateCustomerStats(customer, total);
  }

  private async findOrCreateCustomer(phone: string, name: string): Promise<Customer> {
    let customer = await this.customerRepo.findOne({ where: { phone_number: phone } });
    if (!customer) {
      customer = this.customerRepo.create({ phone_number: phone, name });
      await this.customerRepo.save(customer);
    }
    return customer;
  }

  /** Atualiza contadores de compra e ticket médio. */
  private async updateCustomerStats(customer: Customer, total: number): Promise<void> {
    customer.orders_count = (customer.orders_count ?? 0) + 1;
    customer.total_spent = Number(customer.total_spent ?? 0) + total;
    customer.average_ticket = Number((customer.total_spent / customer.orders_count).toFixed(2));
    customer.last_order_at = new Date();
    await this.customerRepo.save(customer);
  }
}