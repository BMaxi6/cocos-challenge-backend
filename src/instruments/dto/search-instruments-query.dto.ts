import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchInstrumentsQueryDto {
  @ApiProperty({
    description: 'Partial search by ticker or name (case-insensitive)',
    example: 'YPF',
  })
  @IsString()
  @IsNotEmpty()
  search!: string;
}
