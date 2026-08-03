# Cocos challenge backend

API REST para instrumentos, portfolio y órdenes, implementada con NestJS + TypeScript + Prisma + PostgreSQL.

## Stack

- `NestJS` (arquitectura modular, controllers/services/repositories)
- `TypeScript`
- `Prisma` (con SQL explícito en consultas agregadas)
- `PostgreSQL`
- `Swagger` (`/api/docs`)
- `Pino` (`nestjs-pino`) para logs estructurados

## Requisitos

- Node.js 18+
- npm 10+
- PostgreSQL

## Variables de entorno

Archivo de referencia: `.env.example`.

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=v1
LOG_LEVEL=info
PRETTY_LOGS=false

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cocos_challenge?schema=public
```

### Logging

- `LOG_LEVEL`: `fatal | error | warn | info | debug | trace | silent`
- `PRETTY_LOGS=true`: salida legible para desarrollo
- `PRETTY_LOGS=false`: salida JSON estructurada (recomendada para producción)

## Instalación y ejecución

```bash
npm install
npx prisma generate
npm run start:dev
```

API base: `http://localhost:3000/v1`

- Health: `GET /v1/health`
- Swagger: `http://localhost:3000/api/docs`

## Testing

`test/orders.e2e-spec.ts` usa un schema temporal en la misma base:

- crea schema de test
- ejecuta schema + seed
- corre la suite
- borra schema al finalizar (por default)

Para preservar schema y auditar datos:

```bash
npm run test:e2e:orders:keep-schema
```

o

```bash
KEEP_TEST_SCHEMA=1 npm run test:e2e:orders
```

## Documentación decisiones

- Desitions: `docs/DESITIONS.md`

## Postman

- Collection: `docs/postman/Cocos-Challenge.postman_collection.json`
- Environment: `docs/postman/Cocos-Challenge-Local.postman_environment.json`

## Scripts útiles

- `npm run build`
- `npm run start:dev`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:studio`


