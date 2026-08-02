import { ApiProperty } from '@nestjs/swagger';

export class PortfolioPositionDto {
  @ApiProperty({ example: 47 })
  instrumentId!: number;

  @ApiProperty({ example: 'LOMA' })
  ticker!: string;

  @ApiProperty({ example: 'Loma Negra S.A.' })
  name!: string;

  @ApiProperty({ example: 40 })
  quantity!: number;

  @ApiProperty({ example: '930.00' })
  averageCost!: string;

  @ApiProperty({ example: '925.85' })
  marketPrice!: string;

  @ApiProperty({ example: '37034.00' })
  marketValue!: string;

  @ApiProperty({ example: '-0.45' })
  totalReturnPercentage!: string;
}

export class PortfolioResponseDto {
  @ApiProperty({ example: '950000.00' })
  totalValue!: string;

  @ApiProperty({ example: '250000.00' })
  availableCash!: string;

  @ApiProperty({ type: PortfolioPositionDto, isArray: true })
  positions!: PortfolioPositionDto[];
}
