# Cocos challenge backend

API REST para portfolio, instrumentos y órdenes (NestJS + TypeScript + Prisma + PostgreSQL).

## Requisitos

- Node.js 18+
- PostgreSQL

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

La API queda en `http://localhost:3000/v1`.

- Health check: `GET /v1/health`
- Swagger: `http://localhost:3000/api/docs`
- Logs estructurados: Pino (`LOG_LEVEL`, `PRETTY_LOGS`)

## Documentación

- [Consigna](docs/CONSIGNA.md)
- [Guía técnica](docs/TECHNICAL_GUIDE.md)
- [Diseño API REST](docs/API_REST.md)

## Postman

- Collection: `docs/postman/Cocos-Challenge.postman_collection.json`
- Environment: `docs/postman/Cocos-Challenge-Local.postman_environment.json`
