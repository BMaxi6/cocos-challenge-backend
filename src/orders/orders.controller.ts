import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiSecurity('X-USER-ID')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a MARKET or LIMIT order' })
  @ApiCreatedResponse({
    description: 'Order created (FILLED, NEW, or REJECTED)',
    type: OrderResponseDto,
  })
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an existing order in NEW status' })
  @ApiParam({ name: 'id', type: Number, example: 123 })
  @ApiOkResponse({
    description: 'Order cancelled',
    type: OrderResponseDto,
  })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(user, id);
  }
}
