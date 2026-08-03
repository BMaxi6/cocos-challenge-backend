import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { createValidationPipe } from '../src/common/pipes/validation.pipe';

jest.setTimeout(120000);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');

function buildSchemaUrl(baseUrl: string, schema: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  url.searchParams.set('options', `-c search_path=${schema},public`);
  return url.toString();
}

function splitSqlStatements(sql: string): string[] {
  const sanitized = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('---'))
    .join('\n');

  return sanitized
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function qualifyTables(statement: string, schema: string): string {
  return statement.replace(
    /(?<![A-Za-z0-9_])("?)(users|instruments|orders|marketdata)\1(?![A-Za-z0-9_])/g,
    `"${schema}"."$2"`,
  );
}

async function executeSqlScript(
  prisma: PrismaClient,
  schema: string,
  sql: string,
): Promise<void> {
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    const sqlWithSchema = qualifyTables(statement, schema);
    await prisma.$executeRawUnsafe(sqlWithSchema);
  }
}

describe('Orders functional (e2e)', () => {
  let app: INestApplication;
  let adminPrisma: PrismaClient;
  let testPrisma: PrismaClient;
  let testSchema: string;
  let filledOrderId: number;

  const baseDatabaseUrl =
    process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  const keepTestSchema = ['1', 'true', 'yes'].includes(
    (process.env.KEEP_TEST_SCHEMA ?? '').toLowerCase(),
  );

  async function getAvailableQuantityForUserInstrument(
    userId: number,
    instrumentId: number,
  ): Promise<number> {
    const [row] = await testPrisma.$queryRaw<{ availableQuantity: number }[]>`
      SELECT COALESCE(
        SUM(
          CASE
            WHEN status = 'FILLED' AND side = 'BUY' THEN size
            WHEN status = 'FILLED' AND side = 'SELL' THEN -size
            WHEN status = 'NEW' AND type = 'LIMIT' AND side = 'SELL' THEN -size
            ELSE 0
          END
        ),
        0
      )::int AS "availableQuantity"
      FROM orders
      WHERE userid = ${userId}
        AND instrumentid = ${instrumentId}
    `;

    return row.availableQuantity;
  }

  beforeAll(async () => {
    if (!baseDatabaseUrl) {
      throw new Error(
        'E2E_DATABASE_URL (preferred) or DATABASE_URL is required to run e2e tests',
      );
    }

    const createSchemaSql = readFileSync('migrations/database.sql', 'utf8');
    const constraintsSql = readFileSync(
      'migrations/initial_migrations.sql',
      'utf8',
    );

    testSchema = `test_orders_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const testDatabaseUrl = buildSchemaUrl(baseDatabaseUrl, testSchema);

    adminPrisma = new PrismaClient({
      datasources: {
        db: {
          url: baseDatabaseUrl,
        },
      },
    });
    await adminPrisma.$connect();
    await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA "${testSchema}"`);
    // eslint-disable-next-line no-console
    console.log(`E2E test schema: ${testSchema}`);

    process.env.DATABASE_URL = testDatabaseUrl;

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });
    await testPrisma.$connect();

    await executeSqlScript(testPrisma, testSchema, createSchemaSql);
    await executeSqlScript(testPrisma, testSchema, constraintsSql);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
    if (adminPrisma && testSchema) {
      if (!keepTestSchema) {
        await adminPrisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`KEEP_TEST_SCHEMA active. Schema preserved: ${testSchema}`);
      }
      await adminPrisma.$disconnect();
    }

    if (baseDatabaseUrl) {
      process.env.DATABASE_URL = baseDatabaseUrl;
    }
  });

  it('crea una orden MARKET BUY en estado FILLED', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
      })
      .expect(201);

    expect(response.body.status).toBe('FILLED');
    expect(response.body.side).toBe('BUY');
    filledOrderId = response.body.id;
  });

  it('crea y cancela una orden LIMIT BUY (NEW -> CANCELLED)', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 31,
        side: 'BUY',
        type: 'LIMIT',
        size: 1,
        price: 1000,
      })
      .expect(201);

    expect(created.body.status).toBe('NEW');

    const cancelled = await request(app.getHttpServer())
      .patch(`/v1/orders/${created.body.id}/cancel`)
      .set('X-USER-ID', '1')
      .expect(200);

    expect(cancelled.body.status).toBe('CANCELLED');
  });

  it('rechaza BUY por fondos insuficientes (REJECTED)', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 999999999,
      })
      .expect(201);

    expect(response.body.status).toBe('REJECTED');
    expect(response.body.rejectionReason).toBe('INSUFFICIENT_FUNDS');
  });

  it('rechaza SELL por tenencia insuficiente (REJECTED)', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'SELL',
        type: 'MARKET',
        size: 999999999,
      })
      .expect(201);

    expect(response.body.status).toBe('REJECTED');
    expect(response.body.rejectionReason).toBe('INSUFFICIENT_HOLDINGS');
  });

  it('rechaza MARKET cuando no hay precio de mercado', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 66,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
      })
      .expect(201);

    expect(response.body.status).toBe('REJECTED');
    expect(response.body.rejectionReason).toBe('MARKET_PRICE_NOT_AVAILABLE');
  });

  it('valida input: no permite size y amount juntos', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
        amount: 1000,
      })
      .expect(400);

    expect(response.body.code).toBe('INVALID_ORDER_INPUT');
  });

  it('valida input: LIMIT sin price', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 31,
        side: 'BUY',
        type: 'LIMIT',
        size: 1,
      })
      .expect(400);

    expect(response.body.code).toBe('INVALID_ORDER_INPUT');
  });

  it('valida input: MARKET no acepta price', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
        price: 900,
      })
      .expect(400);

    expect(response.body.code).toBe('INVALID_ORDER_INPUT');
  });

  it('valida amount demasiado bajo para comprar al menos 1 acción', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('X-USER-ID', '1')
      .send({
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        amount: 0.01,
      })
      .expect(400);

    expect(response.body.code).toBe('AMOUNT_TOO_LOW');
  });

  it('no permite cancelar orden que no está en NEW', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/v1/orders/${filledOrderId}/cancel`)
      .set('X-USER-ID', '1')
      .expect(409);

    expect(response.body.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('devuelve ORDER_NOT_FOUND al cancelar una orden inexistente', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/orders/999999/cancel')
      .set('X-USER-ID', '1')
      .expect(404);

    expect(response.body.code).toBe('ORDER_NOT_FOUND');
  });

  it('en concurrencia evita doble uso de tenencia (1 NEW + 1 REJECTED)', async () => {
    const payload = {
      instrumentId: 47,
      side: 'SELL',
      type: 'LIMIT',
      size: 30,
      price: 2000,
    };

    const availableBefore = await getAvailableQuantityForUserInstrument(
      1,
      payload.instrumentId,
    );
    expect(availableBefore).toBeGreaterThanOrEqual(payload.size);
    expect(availableBefore).toBeLessThan(payload.size * 2);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/v1/orders')
        .set('X-USER-ID', '1')
        .send(payload),
      request(app.getHttpServer())
        .post('/v1/orders')
        .set('X-USER-ID', '1')
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const outcomes = [first.body, second.body];
    const statusList = outcomes.map((order) => order.status).sort();
    expect(statusList).toEqual(['NEW', 'REJECTED']);

    const rejectedOrder = outcomes.find((order) => order.status === 'REJECTED');
    expect(rejectedOrder).toBeDefined();
    expect(rejectedOrder.rejectionReason).toBe('INSUFFICIENT_HOLDINGS');

    const reservedAfter = await testPrisma.order.aggregate({
      where: {
        userId: 1,
        instrumentId: payload.instrumentId,
        side: 'SELL',
        type: 'LIMIT',
        status: 'NEW',
      },
      _sum: { size: true },
    });
    expect(reservedAfter._sum.size ?? 0).toBeLessThanOrEqual(availableBefore);
  });
});
