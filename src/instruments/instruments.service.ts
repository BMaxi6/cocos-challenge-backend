import { Injectable } from '@nestjs/common';
import { InstrumentResponseDto } from './dto/instrument-response.dto';
import { InstrumentsRepository } from './instruments.repository';

@Injectable()
export class InstrumentsService {
  constructor(private readonly instrumentsRepository: InstrumentsRepository) {}

  async search(search: string): Promise<InstrumentResponseDto[]> {
    const instruments =
      await this.instrumentsRepository.searchByTickerOrName(search);

    return instruments.map((instrument) => ({
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    }));
  }
}
