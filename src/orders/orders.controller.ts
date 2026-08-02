import { Controller } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiSecurity('X-USER-ID')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
}
