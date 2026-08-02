# Diseño de la API REST

La API expondrá recursos relacionados con instrumentos, órdenes y portfolio.

Los endpoints seguirán convenciones REST y mantendrán separados los detalles HTTP de las reglas de negocio.

## 1. Identificación del usuario

El challenge no requiere implementar autenticación.

Para evitar que la lógica de negocio dependa de un `userId` enviado arbitrariamente dentro del body, el usuario será representado temporalmente mediante un header:

`X-USER-ID`

Ejemplo:

```http id="0eq21p"
X-USER-ID: 1
```

Un Guard será responsable de:

1. leer el header;
2. validar su formato;
3. verificar que el usuario exista;
4. asociar el usuario al request.

Los controllers recibirán posteriormente el usuario mediante un decorator propio, por ejemplo:

```text id="9czds7"
@CurrentUser()
```

En un entorno productivo, este mecanismo podría reemplazarse por autenticación JWT sin modificar la lógica de negocio.

---

## 2. Buscar instrumentos

`GET /instruments?search={value}`

Permite buscar instrumentos por:

- ticker;
- nombre.

La búsqueda será:

- case-insensitive;
- parcial.

Ejemplos:

```http id="hhubmh"
GET /instruments?search=YPF
GET /instruments?search=galicia
GET /instruments?search=GGAL
```

Respuesta conceptual:

```json id="9sbg7v"
[
  {
    "id": 50,
    "ticker": "YPFD",
    "name": "Y.P.F. S.A.",
    "type": "ACCIONES"
  }
]
```

---

## 3. Consultar portfolio

`GET /portfolio`

El usuario se obtiene del contexto de autenticación simulado mediante `X-USER-ID`.

La respuesta incluirá:

```json id="1gd6gl"
{
  "totalValue": "950000.00",
  "availableCash": "250000.00",
  "positions": [
    {
      "instrumentId": 47,
      "ticker": "LOMA",
      "name": "Loma Negra S.A.",
      "quantity": 40,
      "averageCost": "930.00",
      "marketPrice": "925.85",
      "marketValue": "37034.00",
      "totalReturnPercentage": "-0.45"
    }
  ]
}
```

Los valores monetarios se serializarán de forma consistente evitando pérdida de precisión.

---

## 4. Crear una orden

`POST /orders`

Body utilizando cantidad:

```json id="e3gk3d"
{
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "size": 10
}
```

Body utilizando monto:

```json id="6v0ap2"
{
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "amount": "100000.00"
}
```

Orden LIMIT:

```json id="gnlxdo"
{
  "instrumentId": 47,
  "side": "BUY",
  "type": "LIMIT",
  "size": 10,
  "price": "900.00"
}
```

Debe informarse exactamente uno entre:

- `size`
- `amount`

Las órdenes `LIMIT` requieren `price`.

Las órdenes `MARKET` no aceptan un precio informado por el cliente, ya que el precio se obtiene de `marketdata`.

El usuario no forma parte del body.

---

## 5. Respuesta de creación

Una orden creada correctamente devolverá la representación persistida.

Ejemplo:

```json id="fht7jo"
{
  "id": 123,
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "size": 10,
  "price": "925.85",
  "status": "FILLED",
  "datetime": "2026-08-02T03:20:00.000Z"
}
```

Una orden que no puede ejecutarse por una condición de negocio también puede haber sido persistida.

Ejemplo:

```json id="1q3r64"
{
  "id": 124,
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "size": 100000,
  "price": "925.85",
  "status": "REJECTED",
  "datetime": "2026-08-02T03:21:00.000Z"
}
```

El contrato HTTP exacto para órdenes rechazadas se definirá junto con la estrategia global de manejo de errores.

---

## 6. Cancelar una orden

`PATCH /orders/:orderId/cancel`

Ejemplo:

```http id="7tznb1"
PATCH /orders/123/cancel
X-USER-ID: 1
```

Solo pueden cancelarse órdenes:

`NEW`

La orden debe pertenecer al usuario autenticado.

Una cancelación válida produce:

`NEW → CANCELLED`

La operación devolverá la orden actualizada.

---

## 7. Health check

`GET /health`

Permitirá verificar la disponibilidad básica de la aplicación.

Respuesta conceptual:

```json id="ctudw9"
{
  "status": "ok"
}
```

Podrá incluir además el estado de conectividad con la base de datos.

---

## 8. Convenciones HTTP

La API utilizará códigos HTTP de forma consistente.

Como criterio general:

```text id="dq1fpg"
200 OK
→ consultas y operaciones exitosas

201 Created
→ creación de una orden

400 Bad Request
→ request estructuralmente inválido

404 Not Found
→ recurso inexistente

409 Conflict
→ operación incompatible con el estado actual del recurso

500 Internal Server Error
→ error inesperado
```

Los errores de negocio tendrán además códigos internos estables que permitan identificar programáticamente la causa.

> Decision: Si una orden se crea rejected aún así devolvemos un 201 con el status correspondiente. Algunas personas podrian devolver un error 400 pero para mi, el 201 es consistente con lo que venimos haciendo. 201 significa que creaste la orden, es decir la API pudo concretar el llamado y su respuesta.

---

## 9. Documentación

Todos los endpoints estarán documentados mediante Swagger.

La documentación incluirá:

- parámetros;
- headers;
- request bodies;
- responses;
- códigos HTTP;
- ejemplos;
- errores relevantes.

La documentación estará disponible localmente desde:

`GET /api/docs`

## 10. Extras

- Todos los endpoints deberan tener manejo de errores, logs, validar el formato de la request y sus paremetros, y las demás buenas practicas que ya conocemos
- Recordar el versionado de la API. Me gustaría que el path inicie con V1 por si a futuro debemos sacar versiones y mantener la retrocompatibilidad

## 11. Manejo de errores

La API utilizará un contrato de errores consistente y determinista.

Se distinguirán explícitamente:

1. errores de la API o del request;
2. rechazos de órdenes por reglas de negocio;
3. errores inesperados de infraestructura o aplicación.

---

### 1. Contrato de error

Los errores HTTP seguirán una estructura común.

Ejemplo:

```json id="eq6x7t"
{
  "statusCode": 400,
  "code": "INVALID_ORDER_INPUT",
  "message": "Exactly one of size or amount must be provided",
  "path": "/orders",
  "timestamp": "2026-08-02T03:30:00.000Z"
}
```

Campos:

- `statusCode`: código HTTP.
- `code`: identificador estable y programático del error.
- `message`: descripción legible.
- `path`: endpoint donde ocurrió.
- `timestamp`: momento del error.

---

### 2. Errores de validación

Requests estructuralmente inválidos responderán:

`400 Bad Request`

Ejemplos:

- `side` inválido;
- `type` inválido;
- `size <= 0`;
- `amount <= 0`;
- envío simultáneo de `size` y `amount`;
- ausencia de ambos;
- orden `LIMIT` sin `price`;
- `price <= 0`;
- envío de `price` para una orden `MARKET`;
- parámetros con formato inválido.

Ejemplos de códigos:

```text id="t3j8rf"
INVALID_ORDER_INPUT
INVALID_ORDER_SIDE
INVALID_ORDER_TYPE
INVALID_SIZE
INVALID_AMOUNT
INVALID_PRICE
```

Las validaciones puramente estructurales se realizarán principalmente mediante DTOs y `class-validator`.

---

### 3. Recursos inexistentes

Cuando el recurso solicitado no exista se responderá:

`404 Not Found`

Ejemplos:

```text id="gytcm4"
USER_NOT_FOUND
INSTRUMENT_NOT_FOUND
ORDER_NOT_FOUND
```

Por ejemplo, intentar crear una orden sobre un `instrumentId` inexistente no genera una orden `REJECTED`.

El request referencia un recurso inválido y, por lo tanto, la orden no debe crearse.

---

### 4. Conflictos de estado

Cuando una operación sea válida estructuralmente pero incompatible con el estado actual del recurso se utilizará:

`409 Conflict`

Ejemplo principal:

intentar cancelar una orden cuyo estado no sea `NEW`.

Código:

```text id="eb5o5i"
ORDER_NOT_CANCELLABLE
```

La orden existente no cambia de estado.

---

### 5. Órdenes rechazadas

Un rechazo de negocio durante `POST /orders` no se representará como un error HTTP cuando la solicitud permita crear correctamente una orden.

La orden será persistida con:

`status = REJECTED`

y la API responderá:

`201 Created`

Ejemplos:

#### Fondos insuficientes

```text id="3d2r9m"
BUY
requiredCash > availableCash

→ REJECTED
```

#### Tenencia insuficiente

```text id="iw2yk4"
SELL
requestedSize > availableQuantity

→ REJECTED
```

El rechazo forma parte del dominio de órdenes y no representa una falla de la API. A demás que es un requerimiento que estas queden guardadas.

---

### 6. Motivo de rechazo

Aunque el esquema provisto no contiene una columna `rejectionReason`, la respuesta de creación podrá incluir un motivo derivado durante el procesamiento.

Ejemplo conceptual:

```json id="yyz5bh"
{
  "id": 125,
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "size": 10000,
  "price": "925.85",
  "status": "REJECTED",
  "rejectionReason": "INSUFFICIENT_FUNDS",
  "datetime": "2026-08-02T03:30:00.000Z"
}
```

Posibles motivos:

```text id="ffuf3w"
INSUFFICIENT_FUNDS
INSUFFICIENT_HOLDINGS
```

El motivo no será persistido inicialmente dado que no forma parte del modelo provisto.

---

### 7. Precio de mercado no disponible

Cuando se recibe una orden `MARKET`, la aplicación debe obtener el último `close` no nulo disponible para el instrumento.

Conceptualmente:

```sql id="1gnf0s"
SELECT close
FROM marketdata
WHERE instrumentId = ?
  AND close IS NOT NULL
ORDER BY date DESC
LIMIT 1;
```

Si el instrumento existe pero no posee ningún precio de mercado disponible, la orden no puede ejecutarse.

Esta situación será considerada un rechazo de negocio y no un error HTTP, dado que:

- el request representa una orden válida;
- el instrumento existe;
- la API pudo procesar correctamente la solicitud;
- la imposibilidad de ejecución forma parte del resultado de la orden.

Por lo tanto, la orden será persistida con:

`status = REJECTED`

y la API responderá:

`201 Created`

El motivo de rechazo será:

`MARKET_PRICE_NOT_AVAILABLE`

Ejemplo conceptual:

```json id="x00lnn"
{
  "id": 126,
  "instrumentId": 47,
  "side": "BUY",
  "type": "MARKET",
  "size": 10,
  "price": null,
  "status": "REJECTED",
  "rejectionReason": "MARKET_PRICE_NOT_AVAILABLE",
  "datetime": "2026-08-02T03:35:00.000Z"
}
```

No se utilizará ningún precio por defecto ni se intentará inferir un precio a partir de otros campos de `marketdata`.

La ausencia de precio no deberá producir efectos sobre saldo, posiciones o recursos reservados, ya que únicamente las órdenes `FILLED` y las órdenes pendientes `NEW` correspondientes participan de esos cálculos.

---

### 8. Errores de infraestructura

Errores inesperados relacionados con:

- base de datos;
- conectividad;
- dependencias internas;
- errores no controlados;

responderán:

`500 Internal Server Error`

La respuesta externa no expondrá:

- stack traces;
- SQL;
- credenciales;
- detalles internos de infraestructura.

Ejemplo:

```json id="mv0xcx"
{
  "statusCode": 500,
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "path": "/orders",
  "timestamp": "2026-08-02T03:30:00.000Z"
}
```

El detalle completo del error será registrado internamente mediante logging.

---

### 9. Exception Filter global

Se utilizará un Exception Filter global de NestJS para transformar excepciones conocidas al contrato estándar de errores.

Conceptualmente:

```text id="13fltg"
Exception
   ↓
GlobalExceptionFilter
   ↓
HTTP status
error code
message
path
timestamp
```

Esto evita que cada controller implemente manualmente el formato de errores.

---

### 10. Errores de dominio

Las reglas de negocio no dependerán directamente de excepciones HTTP de NestJS.

Cuando sea necesario representar un error de dominio se utilizarán errores propios de la aplicación.

Conceptualmente:

```text id="p2mz76"
OrderNotCancellableError
InstrumentNotFoundError
MarketPriceNotAvailableError
```

La capa HTTP será responsable de traducir estos errores al status correspondiente.

Esto mantiene separada la lógica de negocio del protocolo HTTP.

---

### 11. Logging de errores

Los errores inesperados serán registrados con suficiente contexto para permitir diagnóstico.

Como mínimo:

- método HTTP;
- endpoint;
- status;
- error;
- stack trace interno;
- request ID.

Los errores esperados de validación o negocio podrán registrarse con un nivel menor para evitar generar ruido innecesario.

No se registrarán datos sensibles innecesarios.


## Portfolio y cálculos financieros

El portfolio representa el estado financiero actual de una cuenta.

Su cálculo utilizará `orders` como fuente de verdad y los últimos precios disponibles en `marketdata` para valuar las posiciones.

---

### 1. Componentes del portfolio

La respuesta deberá incluir:

- valor total de la cuenta;
- pesos disponibles para operar;
- posiciones actuales;
- cantidad de acciones por posición;
- costo promedio;
- precio actual;
- valor monetario actual de cada posición;
- rendimiento total de cada posición.

Conceptualmente:

```text
Portfolio
├── totalValue
├── availableCash
└── positions
    ├── instrument
    ├── quantity
    ├── averageCost
    ├── marketPrice
    ├── marketValue
    └── totalReturnPercentage
```

---

### 2. Movimientos considerados

Para reconstruir la tenencia ejecutada se utilizarán únicamente órdenes:

`status = FILLED`

Esto incluye:

- `BUY`;
- `SELL`;
- `CASH_IN`;
- `CASH_OUT`.

El tipo de orden (`MARKET` o `LIMIT`) no afecta este criterio.

Una orden histórica `LIMIT` en estado `FILLED` representa una operación ejecutada y debe participar normalmente de los cálculos.

Las órdenes:

- `REJECTED`;
- `CANCELLED`;

no producen ningún efecto financiero.

Las órdenes `NEW` no modifican la tenencia ejecutada, pero pueden reservar recursos disponibles para nuevas operaciones.

---

### 3. Pesos disponibles para operar

Se distinguirá entre:

- efectivo ejecutado;
- efectivo reservado;
- efectivo disponible para operar.

La fórmula será:

`availableCash = executedCash - reservedCash`

Este es el valor utilizado para validar nuevas órdenes de compra.

También será el valor expuesto como pesos disponibles para operar en el endpoint de portfolio.

---

### 4. Cantidad actual de una posición

Para cada instrumento de tipo `ACCIONES`:

```text
currentQuantity =
    SUM(BUY FILLED size)
  - SUM(SELL FILLED size)
```

Solo se considerarán posiciones activas aquellas donde:

`currentQuantity > 0`

Las posiciones con cantidad cero no serán incluidas en la respuesta del portfolio.

Una cantidad negativa indicaría una inconsistencia en los datos, dado que el dominio no permite posiciones short.

---

### 5. Costo promedio ponderado

Se utilizará el método de costo promedio ponderado para determinar el costo de adquisición de las acciones actualmente mantenidas.

Ante una compra:

```text
newAverageCost =
(
  currentQuantity × currentAverageCost
  +
  buyQuantity × buyPrice
)
/
(
  currentQuantity + buyQuantity
)
```

Ejemplo:

```text
Compra 1:
10 acciones × $100
averageCost = $100

Compra 2:
10 acciones × $120

newAverageCost =
(10 × 100 + 10 × 120) / 20

newAverageCost = $110
```

---

### 6. Cierre completo de una posición

Si una venta reduce la cantidad a:

`0`

la posición queda cerrada.

Su costo promedio deja de ser relevante para el portfolio actual.

Si posteriormente el usuario vuelve a comprar el mismo instrumento, se considera una nueva posición y el costo promedio comienza nuevamente a partir de esa compra.

Ejemplo:

```text
BUY 10 × $100
SELL 10 × $120

quantity = 0

posteriormente:

BUY 5 × $150

quantity = 5
averageCost = $150
```

No se arrastra el costo promedio de la posición anterior.

---

### 7. Precio actual

Para cada posición se utilizará el último `close` no nulo disponible:

```sql
SELECT close
FROM marketdata
WHERE instrumentId = ?
  AND close IS NOT NULL
ORDER BY date DESC
LIMIT 1;
```

El precio obtenido representa el valor actual utilizado para valuar la posición.

---

### 8. Valor de mercado

Para cada posición:

`marketValue = currentQuantity × latestClose`

Ejemplo:

```text
quantity = 40
latestClose = $925.85

marketValue = $37.034
```

---

### 9. Costo actual de la posición

El costo asociado a las acciones actualmente mantenidas será:

`positionCost = currentQuantity × averageCost`

Ejemplo:

```text
quantity = 40
averageCost = $930

positionCost = $37.200
```

---

### 10. Rendimiento total

La fórmula definida para el challenge es:

`(valuación actual - costo promedio de compra) / costo promedio de compra`

Aplicada a la posición:

```text
totalReturn =
(marketValue - positionCost)
/
positionCost
```

Equivalentemente:

```text
totalReturn =
(latestClose - averageCost)
/
averageCost
```

Para devolverlo como porcentaje:

`totalReturnPercentage = totalReturn × 100`

Ejemplo:

```text
averageCost = $100
latestClose = $120

totalReturn =
(120 - 100) / 100
= 0.20

totalReturnPercentage = 20%
```

Un rendimiento negativo representa una pérdida no realizada.

---

### 11. Valor total de la cuenta

El valor patrimonial de la cuenta será:

`totalValue = executedCash + SUM(marketValue)`

Para este cálculo se utiliza el efectivo ejecutado, no `availableCash`.

Esto es importante porque el dinero reservado por órdenes pendientes continúa perteneciendo al usuario.

Ejemplo:

```text
executedCash = $100.000
reservedCash = $80.000
availableCash = $20.000

marketValue posiciones = $200.000
```

Entonces:

```text
totalValue = $300.000
```

y no:

```text
$220.000
```

La reserva afecta la capacidad de operar pero no reduce el patrimonio.

---

### 12. Ausencia de precio de mercado

Para calcular la valuación de una posición se utilizará el último `close` no nulo disponible del instrumento.

La implementación asume que todo instrumento con una posición abierta posee al menos un precio disponible en `marketdata`, de acuerdo con el modelo y dataset provistos por el challenge.

La consulta de precio será defensiva y únicamente considerará registros donde `close IS NOT NULL`.