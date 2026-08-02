import { Injectable } from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InstrumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  searchByTickerOrName(search: string): Promise<Instrument[]> {
    return this.prisma.instrument.findMany({
      where: {
        OR: [
          {
            ticker: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: {
        ticker: 'asc',
      },
    });
  }
}
