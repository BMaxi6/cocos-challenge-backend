import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InstrumentResponseDto } from './dto/instrument-response.dto';
import { SearchInstrumentsQueryDto } from './dto/search-instruments-query.dto';
import { InstrumentsService } from './instruments.service';

@Public()
@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search instruments by ticker or name',
  })
  @ApiOkResponse({
    description: 'Matching instruments',
    type: InstrumentResponseDto,
    isArray: true,
  })
  search(
    @Query() query: SearchInstrumentsQueryDto,
  ): Promise<InstrumentResponseDto[]> {
    return this.instrumentsService.search(query.search);
  }
}
