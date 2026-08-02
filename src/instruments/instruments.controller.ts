import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InstrumentsService } from './instruments.service';

@Public()
@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}
}
