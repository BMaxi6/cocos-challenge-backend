# Cocos challenge backend - Implementacion

## Scope técnico

La solución contempla el desarrollo de una API REST para la gestión de instrumentos, órdenes y portfolio, priorizando correctitud funcional, consistencia de datos, mantenibilidad y capacidad de evolución.

Incluye:

* API REST para:
    * consulta y búsqueda de instrumentos;
    * creación y cancelación de órdenes;
    * consulta del portfolio de un usuario.
* Implementación de las reglas de negocio asociadas a:
    * órdenes BUY y SELL;
    * movimientos CASH_IN y CASH_OUT;
    * órdenes MARKET y LIMIT;
    * estados NEW, FILLED, REJECTED y CANCELLED;
    * validación de saldo y tenencia disponible.
* Persistencia en base de datos relacional, contemplando:
    * integridad de datos;
    * constraints;
    * índices;
    * transacciones para operaciones críticas;
    * precisión adecuada para valores monetarios.
* Cálculo del portfolio a partir de las órdenes ejecutadas:
    * pesos disponibles;
    * posiciones actuales;
    * cantidad de cada activo;
    * costo promedio ponderado;
    * valuación actual;
    * rendimiento total;
    * valor total de la cuenta.
* Manejo consistente y determinista de errores:
    * errores de validación;
    * errores de negocio;
    * recursos inexistentes;
    * errores internos.
* Test: Revisar
* Observabilidad básica:
    * logs estructurados;
    * identificación de requests;
    * registro de errores;
    * health check;
    * posibilidad de incorporar métricas en una evolución productiva.
    * Versionado de API
* Documentación:
    * documentación interactiva de la API;
    * instrucciones para ejecutar el proyecto localmente;
    * decisiones de diseño y supuestos;
    * documentación de mejoras y consideraciones para un entorno productivo.

Fuera de scope:

* Autenticación y autorización real de usuarios.
* Simulación del mercado o matching engine.
* Ejecución automática de órdenes LIMIT.
* Procesamiento de dividendos.
* Arquitectura distribuida o microservicios.
* Cache distribuida.
* Implementación de una proyección o snapshot del portfolio.
* Infraestructura productiva de observabilidad y monitoreo.

> Decision: La busqueda de instrumentos sin un search queda descartada. En ningun momento habla de poder realizar la consulta a /instruments y traer todos los instrumentos. Por el mismo motivo para mantenerlo simple decidi no implementar paginación en el endpoint.

## Principios y decisiones de diseño

La implementación busca resolver los requerimientos del challenge manteniendo criterios aplicables a un sistema productivo, evitando incorporar complejidad que no resuelva un problema concreto.

> Decision: Encare esto pensando en demostrar decisiones e implementaciones que me parecen importantes a la hora de llevar una aplicación a producción. Sobretodo para un modulo financiero. Como dije arriba, siempre y cuando esto no implique sobrediseñar o una complejidad muy grande que nos saque de scope.


### 1. Correctitud antes que optimización

La prioridad es garantizar que las reglas de negocio produzcan resultados correctos y consistentes.
Las optimizaciones se incorporarán únicamente cuando exista una necesidad concreta o una justificación clara basada en los patrones de acceso a los datos.


### 2. La base de datos como fuente de verdad

Las órdenes persistidas constituyen la fuente de verdad para reconstruir el estado financiero de una cuenta.
El portfolio, las posiciones y el saldo disponible se calcularán a partir de los movimientos correspondientes almacenados en orders, respetando el requerimiento funcional del challenge.

Como posible evolución para escenarios de alto volumen, recomiendo el uso de una proyección de posiciones (tabla portfolio_snapshot) que permita evitar reconstruir el portfolio completo en cada consulta.


### 3. Integridad en múltiples capas

Las reglas serán validadas en la capa correspondiente:

* API: formato y estructura de los requests.
* Dominio: reglas de negocio.
* Base de datos: integridad estructural mediante constraints, foreign keys y restricciones de unicidad.

La base de datos no dependerá exclusivamente de que la aplicación envíe información válida.


### 4. Consistencia transaccional

Las operaciones que impliquen múltiples lecturas, validaciones o escrituras relacionadas se ejecutarán dentro de una transacción cuando sea necesario garantizar consistencia.

La creación y ejecución de órdenes se considera una operación crítica.

Los posibles problemas de concurrencia y estrategias de locking adicionales se documentarán como consideraciones para un entorno de mayor escala.


### 5. Separación de responsabilidades

Las responsabilidades de transporte HTTP, reglas de negocio y persistencia permanecerán separadas.

De forma conceptual:

Controller → Service → Repository → Database

* Los controllers gestionan HTTP.
* Los services implementan y coordinan reglas de negocio.
* Los repositories encapsulan el acceso a datos.

La lógica de negocio no deberá depender de detalles del protocolo HTTP ni quedar distribuida entre controllers y repositories.


### 6. Precisión financiera

Los valores monetarios y cálculos financieros utilizarán representación decimal exacta.

No se utilizarán tipos de punto flotante (float/double) para dinero, precios, costos o cálculos derivados.

Los redondeos se aplicarán únicamente cuando exista una regla de negocio que los requiera.


7. Errores explícitos, reutilizables y deterministas

Los errores de negocio deberán ser identificables, reutilizables y producir respuestas consistentes.

Situaciones diferentes, como saldo insuficiente, instrumento inexistente o una orden inválida, deberán poder distinguirse mediante códigos de error específicos.


8. Diseño orientado a evolución

La arquitectura debe permitir reemplazar o evolucionar componentes sin modificar innecesariamente otras capas del sistema.

Por ejemplo, el cálculo del portfolio desde orders podría ser reemplazado en el futuro por una proyección optimizada sin modificar el contrato HTTP del endpoint.

Esto no implica implementar anticipadamente infraestructura que actualmente no sea necesaria.


9. Performance basada en patrones de acceso

Los índices y optimizaciones de base de datos se definirán en función de las consultas reales del sistema.

No se agregarán índices de forma preventiva sin identificar previamente qué operación buscan optimizar.


10. Alcance controlado

No se implementarán componentes únicamente para simular una arquitectura productiva.

Funcionalidades como autenticación completa, cache distribuida, mensajería, microservicios o un motor de matching solo se incorporarán si forman parte del requerimiento o resuelven una necesidad concreta.

Cuando sean relevantes para una posible evolución del sistema, se documentarán sin implementarlas.




## Arquitectura y stack tecnológico

### 1. Runtime y lenguaje

La aplicación se desarrollará utilizando:

* Node.js
* TypeScript

TypeScript permite mantener contratos explícitos entre las distintas capas de la aplicación y detectar errores de tipos durante el desarrollo.

⸻

### 2. Framework: NestJS

Se utilizará NestJS como framework para construir la API REST. La elección técnica se basa principalmente en:

* arquitectura modular;
* inyección de dependencias;
* separación clara de responsabilidades;
* integración con validaciones, guards, interceptors y exception filters;
* facilidad para implementar testing;
* soporte integrado para documentación mediante Swagger.

La estructura general seguirá el flujo:

*Controller → Service → Repository → Database*

**Controllers**

Responsables de:

* definir endpoints;
* recibir parámetros HTTP;
* ejecutar validaciones estructurales mediante DTOs;
* delegar la operación al service correspondiente;
* devolver la respuesta HTTP.

No deberán contener reglas de negocio ni consultas a la base de datos.

**Services**

Responsables de:

* implementar reglas de negocio;
* coordinar operaciones;
* ejecutar validaciones de dominio;
* decidir cuándo una operación debe realizarse transaccionalmente;
* interactuar con uno o más repositories.

Ejemplos:

* determinar el estado inicial de una orden;
* calcular size a partir de amount;
* validar saldo disponible;
* validar tenencia disponible;
* calcular posiciones y rendimiento.

**Repositories**

Responsables exclusivamente del acceso a datos.

Encapsulan:

* consultas;
* inserciones;
* actualizaciones;
* agregaciones;
* acceso mediante ORM o SQL.

No contienen reglas de negocio.

> Decisión: Next JS me parecio importante ya que me dejaba demostrar las responsabilidades y la estructura del código. Siendo un challegne técnico creo que es más interesante. Dato de color, me suele gustar mas trabajar con frameworks mas estrictos y reglas claras. No soy muy fan del vale todo.

⸻

### 3. Organización por dominio

La aplicación se organizará principalmente por módulos funcionales y no por tipo de archivo global.

Estructura conceptual:

src/
├── app.module.ts
├── main.ts
│
├── common/
│   ├── errors/
│   ├── filters/
│   ├── interceptors/
│   └── decorators/
│
├── auth/
│
├── database/
│
├── instruments/
│   ├── dto/
│   ├── instruments.controller.ts
│   ├── instruments.service.ts
│   ├── instruments.repository.ts
│   └── instruments.module.ts
│
├── orders/
│   ├── dto/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.repository.ts
│   └── orders.module.ts
│
└── portfolio/
    ├── portfolio.controller.ts
    ├── portfolio.service.ts
    ├── portfolio.repository.ts
    └── portfolio.module.ts

La estructura definitiva podrá ajustarse durante la implementación si aparece una separación de responsabilidades más clara.

⸻

### 4. Base de datos

Se utilizará una base de datos relacional compatible con el esquema provisto por el challenge.

La base de datos será responsable no solamente de persistir información, sino también de garantizar parte de su integridad mediante:

* primary keys;
* foreign keys;
* unique constraints;
* check constraints;
* índices.

Las reglas puramente de negocio permanecerán en la aplicación.

⸻

### 5. Estrategia de acceso a datos

Se utilizará una estrategia híbrida:

* Prisma para operaciones CRUD, transacciones y consultas simples.
* SQL explícito cuando una consulta compleja o agregada resulte más clara, controlable o eficiente mediante SQL.

> Decision: Utilizamos Prisma para las consultas simples para priorizar la lectura del codigo y evitar el SQL. Pero en algunos casos tener control de la query y poder optimizarla sería lo mejor. Por ejemplo el cálculo del portfolio es un candidato natural para utilizar SQL explícito debido a las agregaciones necesarias sobre orders.

⸻

### 6. Validación de entrada

Se utilizarán DTOs de NestJS junto con class-validator.

Las validaciones estructurales deberán ocurrir antes de ejecutar lógica de negocio.

Ejemplos:

* valores permitidos para side;
* valores permitidos para type;
* valores numéricos positivos;
* campos obligatorios;
* estructura general del request.

Las validaciones que dependan del estado del sistema permanecerán en los services.

Ejemplos:

* saldo disponible;
* cantidad de acciones disponible;
* existencia del instrumento.

⸻

### 7. Documentación de interfaz de API

Se utilizará Swagger

> Decision. Uso swagger para exponer los endpoints y las interfaces y que ustedes puedan probar facilmente. Obviamente sera entregado con la colección de Postman

⸻

### 8. Logging

Se utilizarán logs estructurados.

La implementación podrá utilizar Pino integrado con NestJS.

Los logs deberán permitir identificar, como mínimo:

* request;
* método HTTP;
* endpoint;
* status HTTP;
* duración;
* errores;
* request ID.

No se registrarán datos sensibles innecesarios.

> Decision: No se utilizará console.log como mecanismo de observabilidad de la aplicación. Por experiencia cuando queres buscar logs es un desastre. Vamos a usar Pino con los datos importantes para poder tracker cualquier problema.

⸻

### 9. Manejo global de errores

Se implementará un mecanismo centralizado mediante un Exception Filter global.

Las respuestas de error seguirán un contrato consistente independientemente del punto de la aplicación donde se origine el error.

Los errores se dividirán conceptualmente en:

* validación;
* negocio;
* recurso inexistente;
* infraestructura;
* error interno inesperado.

Los errores de negocio utilizarán códigos estables que permitan identificar programáticamente la causa.

⸻

### 10. Testing

Se utilizará Jest como framework principal de testing.

La estrategia priorizará la cobertura de comportamientos y reglas de negocio relevantes por sobre métricas de cobertura artificiales.

#### Tests funcionales

La creación de órdenes contará con tests funcionales explícitos, dado que constituye un requerimiento obligatorio del challenge.

Estos tests validarán el flujo completo de los principales escenarios de negocio, incluyendo la interacción con persistencia y la respuesta de la API.

#### Tests unitarios

Se implementarán tests unitarios para reglas de negocio que puedan validarse de forma aislada y donde dicha separación aporte valor.

Ejemplos:

- cálculo de `size` a partir de `amount`;
- cálculo de costo promedio ponderado;
- cálculo de rendimiento;
- reglas específicas de validación de órdenes.

No se buscará alcanzar un porcentaje de cobertura determinado ni testear componentes triviales únicamente con ese objetivo.

#### Tests de integración

Se incorporarán únicamente cuando permitan validar comportamientos que no estén suficientemente cubiertos por los tests funcionales.

En particular, no se duplicarán escenarios entre suites sin una justificación concreta.

⸻

### 11. Configuración

La configuración dependiente del entorno se realizará mediante variables de entorno.

El repositorio incluirá un archivo:

.env.example

con las variables necesarias para ejecutar la aplicación.

⸻

### 12. Autenticación

La implementación de autenticación real está fuera del scope del challenge.

Sin embargo, la lógica de negocio no dependerá de recibir libremente un userId dentro de cada body.

Se utilizará una abstracción simple que permita representar un usuario autenticado durante el challenge.

Por ejemplo:

X-USER-ID

El identificador será extraído antes de llegar a la lógica de negocio y estará disponible como usuario del request.

En un entorno productivo esta capa podría reemplazarse por un Guard que valide un JWT mediante el mecanismo de autenticación correspondiente, sin modificar los services del dominio.

No se implementará una autenticación JWT ficticia ni una dependencia inexistente.

⸻

### 13. Health check

La aplicación expondrá un endpoint de health check.

Por ejemplo:

GET /health

Permitirá verificar al menos:

* estado de la aplicación;
* conectividad con la base de datos.

El objetivo es disponer de una verificación mínima de disponibilidad sin implementar una plataforma completa de monitoreo.

⸻

### 14. Dependencias

Se buscará mantener un conjunto reducido y justificado de dependencias.

Una librería deberá incorporarse cuando:

* resuelva un problema concreto;
* reduzca complejidad;
* sea suficientemente madura;
* aporte más valor que una implementación propia simple.

No se agregarán tecnologías únicamente para aumentar artificialmente la complejidad técnica del proyecto.


## Modelo de datos

La base de datos provista por el challenge constituye la fuente inicial del modelo.

El esquema contiene cuatro entidades principales:

- `users`
- `instruments`
- `orders`
- `marketdata`

---

### 1. `users`

Representa las cuentas que pueden operar dentro del sistema.

Esquema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  accountNumber VARCHAR(20) UNIQUE,
);
```

Relación principal:

`users 1 → N orders`

> Decision: email y accountNumber no eran uniques. No tiene sentido arrancar sin esas restricciones. Entiendo que el challenge no habla de repetidos pero es un problema a mi criterio

---

### 2. `instruments`

Representa los instrumentos disponibles para operar.

Esquema original:

```sql
CREATE TABLE instruments (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL,
  CHECK (type IN ('ACCIONES', 'MONEDA'))
);
```

El dataset contiene actualmente dos tipos relevantes:

```text
ACCIONES
MONEDA
```

ARS se encuentra modelado explícitamente como:

```text
ticker = ARS
name   = PESOS
type   = MONEDA
```

> Decision: El efectivo será tratado como un instrumento del sistema y no mediante una tabla de balances independiente.
> Decision: A demás de que el ticker es un identificador unico dentro de cada bolsa de valores. Dentro del dominio, el ticker identifica al instrumento utilizado en las operaciones y búsquedas. Por lo cual se propone como UNIQUE

### 3. `orders`

Es la entidad central del dominio.

Esquema original:

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  instrumentId INT,
  userId INT,
  size INT,
  price NUMERIC(10, 2),
  type VARCHAR(10),
  side VARCHAR(10),
  status VARCHAR(20),
  datetime TIMESTAMP,
  FOREIGN KEY (instrumentId) REFERENCES instruments(id),
  FOREIGN KEY (userId) REFERENCES users(id),
  CHECK (
    side IN ('BUY', 'SELL', 'CASH_IN', 'CASH_OUT')
  ),
  CHECK (
    type IN ('MARKET', 'LIMIT')
  )
  CHECK (
    status IN ('NEW', 'FILLED', 'REJECTED', 'CANCELLED')
  ),
  CHECK (size > 0)
);
```

`orders` representa tanto operaciones sobre activos como movimientos de efectivo.

> Decision: Proteger `SIDE` con check
> Decision: Proteger `TYPES` con check. Los movimientos de efectivo usan MARKET, por lo cual no es necesario un tipo adicional
> Decision: Proteger `STATUS` con check
> Decision: Proteger `SIZE` > 0. No se cambiará `size` a un tipo decimal mientras el dominio definido por el challenge no requiera cantidades fraccionarias.
> Decision: Que price sea un NUMERIC(10,2) me hace ruido para una aplicación financiera. Pero ya que estaba en el SQL lo dejo para facilitar las pruebas y no modificar el esquema funcional provisto. Si hablaramos de un esquema productivo real seguramente deberíamos modificarlo.
> Decision; No se agregará una columna adicional para mantener un historial separado del precio solicitado. Si nos interesara la métrica de ver que precios buscan los usuarios podriamos agregarla.

#### status

Es importante no inferir el estado únicamente a partir del tipo de orden.

El dataset contiene, por ejemplo, una orden histórica:

```text
BUY / LIMIT / FILLED
```

Esto es consistente con un sistema real donde una orden LIMIT puede eventualmente ejecutarse.

Para las nuevas órdenes creadas por esta API:

```text
MARKET → FILLED o REJECTED
LIMIT  → NEW o REJECTED
```

Una orden `LIMIT` válida permanecerá `NEW` porque la implementación no incluye un mercado o matching engine.

Sin embargo, el cálculo del portfolio deberá considerar cualquier orden histórica en estado `FILLED`, independientemente de que sea `MARKET` o `LIMIT`.

#### price

Para una orden `MARKET` ejecutada:

- se obtiene el último `close`;
- ese valor se utiliza como precio de ejecución;
- se persiste en `orders.price`.

Para una orden `LIMIT`:

- `price` representa el precio límite informado para la orden.

---

### 4. `marketdata`

Esquema original:

```sql
CREATE TABLE marketdata (
  id SERIAL PRIMARY KEY,
  instrumentId INT,
  high NUMERIC(10, 2),
  low NUMERIC(10, 2),
  open NUMERIC(10, 2),
  close NUMERIC(10, 2),
  previousClose NUMERIC(10, 2),
  date DATE,
  FOREIGN KEY (instrumentId) REFERENCES instruments(id)
);
```


Contiene los precios históricos disponibles para cada instrumento.

#### Integridad de marketdata

No se impondrán restricciones NOT NULL sobre los valores OHLC (open, high, low, close), ya que el dataset provisto contempla información de mercado parcialmente disponible.

Las consultas que requieran un precio operable deberán seleccionar explícitamente el último close disponible:

```sql
SELECT close
FROM marketdata
WHERE instrumentId = ?
  AND close IS NOT NULL
ORDER BY date DESC
LIMIT 1;
```

Si no existe un close disponible para el instrumento, la aplicación deberá tratarlo explícitamente como ausencia de precio de mercado y no asumir un valor. El error será `MARKET_PRICE_NOT_AVAILABLE`

#### Calculo de precio

Para obtener el precio actual de un activo se utilizará el registro más reciente según `date`.

El precio utilizado será:

```text
close
```

Por ejemplo, conceptualmente:

```sql
SELECT close
FROM marketdata
WHERE instrumentId = ?
  AND close IS NOT NULL
ORDER BY date DESC
LIMIT 1;
```

---

### 5. Integridad referencial

El esquema ya contiene las siguientes Foreign Keys:

```text
orders.instrumentId
→ instruments.id

orders.userId
→ users.id

marketdata.instrumentId
→ instruments.id
```

Estas relaciones serán mantenidas.

No se utilizarán eliminaciones en cascada sobre información financiera histórica.

---

### 6. Índices

Los índices adicionales se definirán en función de los patrones reales de consulta.

#### Orders por usuario y estado

```sql
CREATE INDEX idx_orders_user_status
ON orders(userId, status);
```

Este índice busca optimizar consultas utilizadas para reconstruir el portfolio:

 ```text
 userId = ?
status = FILLED
```

También puede ser utilizado para consultas únicamente por `userId`, debido al orden de las columnas del índice.

#### Último market data

```sql
CREATE INDEX idx_marketdata_instrument_date
ON marketdata(instrumentId, date DESC);
```

Optimiza:

```sql
WHERE instrumentId = ?
ORDER BY date DESC
LIMIT 1
```

que constituye una operación frecuente tanto para ejecutar órdenes `MARKET` como para valuar posiciones.

> Decision: Como al final hicimos instrumentId y date en 1 solo UNIQUE. Ya se crea un indice B-tree

#### Ticker

Se utilizará:

```sql
UNIQUE (ticker)
```

La restricción genera el índice necesario para búsquedas exactas por ticker, por lo que no se agregará un índice B-Tree adicional sobre la misma columna.

---

### 7. Constraints de negocio

No todas las reglas del dominio deben implementarse mediante constraints de base de datos.

Reglas como:

- saldo suficiente;
- tenencia suficiente;
- LIMIT requiere precio;
- MARKET utiliza último precio;
- solo órdenes NEW pueden cancelarse;

dependen del contexto de la operación o del estado de otras entidades.

Estas reglas permanecerán en la capa de negocio.

La base de datos protegerá principalmente invariantes estructurales simples.

Por ejemplo: la API permitirá enviar una orden indicando:

- cantidad (`size`); o
- monto de inversión (`amount`).

Debe informarse exactamente uno de los dos.

Cuando se recibe `amount`, la cantidad máxima posible se calcula como:

```text
size = floor(amount / executionPrice)
```

Ejemplo:

```text
amount = 10.000
price  = 3.000

size = floor(10.000 / 3.000)
size = 3
```

Esto garantiza:

- ausencia de fracciones de acciones;
- que el valor de la orden no supere el monto solicitado.

Si el resultado es cero, la orden no puede ejecutarse.

---

### 8. Tablas no agregadas

#### `balances, positions y portfolio_snapshot`

No se agregarán. Son 3 tablas que baraje como posiblidad pero:

- ARS ya está modelado como instrumento
- Las positions se reconstruirán a partir de órdenes ejecutadas.
- El saldo debe calcularse utilizando los movimientos registrados en `orders`.

> La tabla que mas me gustaría implementar para mejorar performance en grande cantidad de datos es portfolio_snapshot para no tener que recorrer todos los registros cada vez que un usuario quiere ver su portfolio. Pero bueno lo menciono como mejora. Es verdad que haría los insert y edits mas lentos pero sería una gran ventaja. Entiendo que quizas no tengo el contexto financiero y la vista de como funcionan otros portfolios.

---

### 9. Fuente de verdad

Las órdenes constituyen el historial financiero del usuario.

Para reconstruir el portfolio se utilizarán los movimientos pertinentes en estado:

```text
FILLED
```

Esto incluye:

```text
BUY
SELL
CASH_IN
CASH_OUT
```

y no depende de que la orden sea `MARKET` o `LIMIT`.

A partir de estos movimientos se calcularán:

- pesos disponibles;
- cantidad actual de cada activo;
- costo promedio de compra;
- valuación actual;
- rendimiento total;
- valor total de la cuenta.

#### Recursos comprometidos por órdenes pendientes

Las órdenes en estado `NEW` no modifican la tenencia ejecutada del usuario, ya que todavía no representan una operación efectivamente realizada.

Sin embargo, los recursos comprometidos por órdenes pendientes deberán considerarse al determinar cuánto puede utilizar el usuario para nuevas operaciones.

Se distinguirán tres conceptos:

- **Tenencia:** recursos efectivamente poseídos, derivados de órdenes `FILLED`.
- **Reservado:** recursos comprometidos por órdenes `NEW`.
- **Disponible para operar:** tenencia menos recursos reservados.

#### Efectivo reservado

Las órdenes `BUY LIMIT` en estado `NEW` reservan:

`reservedCash = SUM(size × price)`

Por lo tanto:

`availableCash = executedCash - reservedCash`

Este valor será utilizado para validar nuevas órdenes de compra.

#### Acciones reservadas

Las órdenes `SELL LIMIT` en estado `NEW` reservan la cantidad de acciones que pretenden vender.

Para cada instrumento:

`reservedQuantity = SUM(size de SELL LIMIT NEW)`

Por lo tanto:

`availableQuantity = currentQuantity - reservedQuantity`

Este valor será utilizado para validar nuevas órdenes de venta.

#### Cancelación

Cuando una orden `NEW` pasa a `CANCELLED`, deja automáticamente de formar parte del cálculo de recursos reservados.

No es necesario persistir o liberar una reserva adicional.

#### Concurrencia en operaciones de cuenta

La validación de saldo y tenencia debe mantenerse correcta incluso cuando un mismo usuario envía múltiples órdenes concurrentemente.

Una transacción por sí sola no evita que dos operaciones lean simultáneamente el mismo estado disponible antes de persistir sus respectivas órdenes.

Para evitar esta condición de carrera, las operaciones que consuman o reserven recursos adquirirán un lock sobre la cuenta del usuario antes de calcular la disponibilidad.

Conceptualmente:

```sql
SELECT id
FROM users
WHERE id = ?
FOR UPDATE;
```

El lock se mantendrá durante la transacción.

El flujo será:

```text
BEGIN
  ↓
Lock de la cuenta
  ↓
Calcular tenencia y recursos reservados
  ↓
Validar disponibilidad
  ↓
Persistir orden
  ↓
COMMIT
```

Las operaciones concurrentes pertenecientes al mismo usuario serán procesadas secuencialmente durante esta sección crítica.

Las operaciones pertenecientes a usuarios diferentes podrán continuar ejecutándose concurrentemente.

Esta estrategia prioriza consistencia financiera y evita que múltiples requests utilicen simultáneamente los mismos recursos disponibles sin introducir infraestructura adicional de locking. Puede generar un pequeño cuello de botella pero no me parece grave. Son transacciones rapidas

> Decision: Esta estrategia mantiene `orders` como única fuente de verdad y evita introducir estado derivado adicional. No agreguemos ruido al modelo planteaodo. El cancelado empieza a tener sentido en este modelo. El problema es que no permitimos al usuario generar 2 ordenes (si así lo desea) y que se ejecute la que se resuelva primero, pero a la vez hacemos que la otra parte (la otra persona en esta transacción) intente avanzar con una orden y no pueda

---

