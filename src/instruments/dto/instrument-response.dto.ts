import { ApiProperty } from '@nestjs/swagger';

export class InstrumentResponseDto {
  @ApiProperty({ example: 50 })
  id!: number;

  @ApiProperty({ example: 'YPFD' })
  ticker!: string;

  @ApiProperty({ example: 'Y.P.F. S.A.' })
  name!: string;

  @ApiProperty({ example: 'ACCIONES' })
  type!: string;
}
