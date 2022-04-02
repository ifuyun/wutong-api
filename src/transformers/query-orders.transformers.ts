import { Order, OrderItem } from 'sequelize';
import { Message } from '../common/message.enum';
import { BadRequestException } from '../exceptions/bad-request.exception';

export function getQueryOrders(sortFields: Record<string, number>, orders: string | string[]) {
  orders = orders && (typeof orders === 'string' ? [orders] : orders) || [];

  const SORT_KEYS = Object.keys(sortFields);
  const SORT_TYPES = ['asc', 'desc'];
  const sortBy: Order = [];

  orders.forEach((item) => {
    const order = <OrderItem>item.split(',');
    if (!SORT_KEYS.includes(order[0]) || !SORT_TYPES.includes(order[1])) {
      throw new BadRequestException(Message.UNSUPPORTED_QUERY_ORDERS);
    }
    sortBy.push(order);
  });
  sortBy.sort((i, j) => sortFields[i[0]] - sortFields[j[0]]);

  return sortBy;
}
