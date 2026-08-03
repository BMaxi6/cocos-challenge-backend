# Decisiones de diseño consolidadas

Este documento reúne las decisiones explícitas tomadas en:

- `docs/CONSIGNA.md`
- `docs/TECHNICAL_GUIDE.md`
- `docs/API_REST.md`

La idea no es solo listar qué se decidió, sino dejar claro por qué se decidió y qué trade-off implica.

## 1) Alcance del producto

### Decisión: no exponer `GET /instruments` sin `search`
**Justificación**  
La consigna pide "búsqueda por ticker y/o nombre", pero no exige un listado completo de instrumentos. Habilitar un endpoint sin criterio de búsqueda agrega superficie de API y riesgo de consultas pesadas sin necesidad funcional real.

**Impacto**  
Se mantiene una API más explícita y predecible: el cliente debe declarar intención de búsqueda.

---

### Decisión: no incorporar paginación en instrumentos en esta versión
**Justificación**  
Con el dataset actual y el scope del challenge, agregar paginación introduce complejidad (contrato, metadata, tests) sin resolver un problema crítico de negocio.

**Impacto**  
Se prioriza entregar reglas financieras y consistencia transaccional. La paginación queda como evolución natural si crece el volumen o aparecen requisitos de UX.

---

### Decisión: priorizar decisiones "de producción" sin sobrediseñar
**Justificación**  
El objetivo fue balancear calidad técnica con foco de challenge: implementar lo que aporta valor directo (validaciones, errores consistentes, trazabilidad, transacciones) y evitar infraestructura adelantada.

**Impacto**  
Arquitectura simple y extensible, con menor costo de mantenimiento inicial.

## 2) Arquitectura y stack

### Decisión: usar NestJS + TypeScript
**Justificación**  
NestJS permite una separación clara de responsabilidades (`Controller -> Service -> Repository`) y TypeScript refuerza contratos entre capas, reduciendo errores por tipado en un dominio sensible como órdenes y portfolio.

**Impacto**  
Mayor mantenibilidad y legibilidad para evolución incremental del sistema.

---

### Decisión: estrategia híbrida de acceso a datos (Prisma + SQL explícito)
**Justificación**  
Prisma mejora productividad y legibilidad en CRUD/transacciones simples. Para agregaciones financieras complejas (portfolio, disponibilidad, reservas), SQL explícito da más control y evita forzar el ORM en consultas no triviales.

**Impacto**  
Se combina ergonomía de desarrollo con precisión y control en puntos críticos de negocio.

---

### Decisión: documentar API con Swagger y acompañar con colección Postman
**Justificación**  
Swagger funciona como contrato vivo para explorar y validar requests/responses. Postman complementa con casos funcionales y de error reutilizables durante desarrollo y QA.

**Impacto**  
Menor ambigüedad de integración y onboarding más rápido para quien consuma la API.

---

### Decisión: logging estructurado con Pino (evitando `console.log`)
**Justificación**  
En backend, logs planos con `console.log` se vuelven difíciles de filtrar y correlacionar. Pino aporta estructura, contexto y compatibilidad con observabilidad real.

**Impacto**  
Mejor capacidad de diagnóstico (request, método, endpoint, status, latencia, error, request-id).

## 3) Diseño de API y semántica HTTP

### Decisión: `POST /orders` responde `201` incluso cuando la orden queda `REJECTED`
**Justificación**  
El request crea un recurso `order` persistido con resultado de negocio explícito (`status` + `rejectionReason`). No es un error de formato ni de transporte; es una creación válida con outcome negativo.

**Impacto**  
Contrato consistente y auditable: toda intención de orden queda registrada en `orders`.

## 4) Modelo de datos e integridad

### Decisión: `users.email` y `users.accountNumber` deben ser `UNIQUE`
**Justificación**  
Aunque la consigna no profundiza en duplicados, en dominio financiero permitir cuentas/emails repetidos degrada integridad e identidad.

**Impacto**  
Se previenen inconsistencias de datos desde la base y no solo desde la aplicación.

---

### Decisión: modelar ARS como instrumento (`MONEDA`) y no crear tabla de balances separada
**Justificación**  
La consigna ya modela cash como instrumento y define que los cálculos se hagan desde `orders`. Mantener ese criterio evita duplicar fuentes de verdad.

**Impacto**  
Menor complejidad del modelo y consistencia conceptual entre efectivo y activos.

---

### Decisión: `instruments.ticker` como `UNIQUE` y sin índice extra redundante
**Justificación**  
El ticker identifica naturalmente al instrumento en búsquedas/operación. La restricción `UNIQUE` ya crea índice B-Tree, por lo que agregar otro sobre la misma columna no aporta.

**Impacto**  
Integridad semántica + esquema más limpio.

---

### Decisión: reforzar `orders` con checks de integridad (`side`, `type`, `status`, `size > 0`)
**Justificación**  
La aplicación valida, pero la base no debe depender solo de validaciones de API. Los checks protegen invariantes estructurales incluso ante escrituras externas.

**Impacto**  
Defensa en profundidad y menor riesgo de corrupción del dominio.

---

### Decisión: mantener `orders.price` en `NUMERIC(10,2)` por compatibilidad del challenge
**Justificación**  
Para un sistema financiero real podría requerirse otra precisión, pero cambiar el esquema base hubiera aumentado fricción con datos/scripts provistos.

**Impacto**  
Compatibilidad inmediata con el entorno del challenge, dejando explícita la mejora posible para producción.

---

### Decisión: no agregar columna separada para "precio solicitado"
**Justificación**  
No es requisito funcional actual. La distinción entre precio de ejecución (market) y precio límite (limit) queda cubierta por reglas actuales.

**Impacto**  
Modelo más simple; si luego aparece analítica de intención de precio, puede incorporarse como extensión.

## 5) Fuente de verdad, portfolio y concurrencia

### Decisión: `orders` como única fuente de verdad financiera
**Justificación**  
La consigna indica calcular tenencia, saldo y portfolio usando movimientos de `orders`. Mantener una sola fuente evita divergencia entre tablas derivadas y estado real.

**Impacto**  
Trazabilidad completa de cómo se llega al portfolio y menor riesgo de desincronización.

---

### Decisión: no crear `balances`, `positions` ni `portfolio_snapshot` en esta etapa
**Justificación**  
Son opciones válidas para escalar lectura, pero introducen estado derivado y costo de sincronización. Para este alcance, se privilegia correctitud del modelo transaccional sobre optimización prematura.

**Impacto**  
Lecturas potencialmente más costosas en alto volumen, a cambio de simplicidad y consistencia en la etapa actual.

---

### Decisión: considerar reservas desde órdenes `NEW` sin persistir estado adicional
**Justificación**  
Las órdenes pendientes comprometen recursos: `BUY LIMIT NEW` reserva cash y `SELL LIMIT NEW` reserva tenencia. Ese efecto se puede calcular desde `orders` sin tabla extra de reservas.

**Impacto**  
El cálculo de disponibilidad respeta negocio y cancelaciones (`CANCELLED`) sin procesos de compensación adicionales.

---

### Decisión: serializar operaciones críticas por usuario con lock transaccional (`SELECT ... FOR UPDATE`)
**Justificación**  
Una transacción por sí sola no evita que dos requests del mismo usuario lean simultáneamente disponibilidad previa y dupliquen uso de recursos. El lock por cuenta define una sección crítica para leer-validar-persistir en orden.

**Impacto**  
- Corrige race conditions de fondos/tenencia para un mismo usuario.  
- Mantiene concurrencia entre usuarios distintos.  
- Acepta el trade-off de menor paralelismo intra-cuenta durante esa ventana transaccional.

## 6) Trazabilidad de decisiones

- En `docs/API_REST.md` queda explícita la semántica de `201` para órdenes rechazadas.
- En `docs/TECHNICAL_GUIDE.md` se documentan las decisiones de arquitectura, integridad, portfolio y concurrencia.
- En `docs/CONSIGNA.md` se apoya el criterio de cálculo desde `orders`, cash como instrumento y alcance funcional esperado.
