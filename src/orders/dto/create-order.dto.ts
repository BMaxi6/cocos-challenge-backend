import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import {
  ORDER_SIDES,
  ORDER_TYPES,
  OrderSide,
  OrderType,
} from '../types/order.types';

export class CreateOrderDto {
  @ApiProperty({ example: 47 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  instrumentId!: number;

  @ApiProperty({ enum: ORDER_SIDES, example: 'BUY' })
  @IsIn([...ORDER_SIDES])
  side!: OrderSide;

  @ApiProperty({ enum: ORDER_TYPES, example: 'MARKET' })
  @IsIn([...ORDER_TYPES])
  type!: OrderType;

  @ApiPropertyOptional({
    description:
      'Quantity of shares. Exactly one of size or amount is required.',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({
    description:
      'Investment amount in ARS. Exactly one of size or amount is required.',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Required for LIMIT orders and forbidden for MARKET orders.',
    example: 925.85,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;
}
