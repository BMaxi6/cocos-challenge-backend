import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ORDER_REJECTION_REASONS,
  ORDER_SIDES,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../types/order.types';

export class OrderResponseDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 47 })
  instrumentId!: number;

  @ApiProperty({ enum: ORDER_SIDES, example: 'BUY' })
  side!: string;

  @ApiProperty({ enum: ORDER_TYPES, example: 'MARKET' })
  type!: string;

  @ApiProperty({ example: 10 })
  size!: number;

  @ApiProperty({
    nullable: true,
    example: '925.85',
    description: 'Execution price for MARKET or limit price for LIMIT orders.',
  })
  price!: string | null;

  @ApiProperty({ enum: ORDER_STATUSES, example: 'FILLED' })
  status!: string;

  @ApiProperty({ example: '2026-08-02T03:20:00.000Z' })
  datetime!: string;

  @ApiPropertyOptional({
    enum: ORDER_REJECTION_REASONS,
    example: 'INSUFFICIENT_FUNDS',
  })
  rejectionReason?: string;
}
