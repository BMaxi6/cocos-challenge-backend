--- Users table ---

ALTER TABLE users
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN accountNumber SET NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT uq_users_email UNIQUE (email),
    ADD CONSTRAINT uq_users_account_number UNIQUE (accountNumber);

--- Instruments table ---

ALTER TABLE instruments
    ALTER COLUMN ticker SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN type SET NOT NULL;

ALTER TABLE instruments
    ADD CONSTRAINT uq_instruments_ticker UNIQUE (ticker),
    ADD CONSTRAINT chk_instruments_type
        CHECK (type IN ('ACCIONES', 'MONEDA'));

--- Orders table ---

ALTER TABLE orders
    ALTER COLUMN instrumentId SET NOT NULL,
    ALTER COLUMN userId SET NOT NULL,
    ALTER COLUMN size SET NOT NULL,
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN side SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN datetime SET NOT NULL;

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_size
        CHECK (size > 0),

    ADD CONSTRAINT chk_orders_side
        CHECK (side IN ('BUY', 'SELL', 'CASH_IN', 'CASH_OUT')),

    ADD CONSTRAINT chk_orders_type
        CHECK (type IN ('MARKET', 'LIMIT')),

    ADD CONSTRAINT chk_orders_status
        CHECK (status IN ('NEW', 'FILLED', 'REJECTED', 'CANCELLED'));

CREATE INDEX idx_orders_user_status
    ON orders(userId, status);

--- Marketdata table ---

ALTER TABLE marketdata
    ALTER COLUMN instrumentId SET NOT NULL,
    ALTER COLUMN date SET NOT NULL;

ALTER TABLE marketdata
    ADD CONSTRAINT uq_marketdata_instrument_date
        UNIQUE (instrumentId, date),

    ADD CONSTRAINT chk_marketdata_open_positive
        CHECK (open > 0),

    ADD CONSTRAINT chk_marketdata_high_positive
        CHECK (high > 0),

    ADD CONSTRAINT chk_marketdata_low_positive
        CHECK (low > 0),

    ADD CONSTRAINT chk_marketdata_close_positive
        CHECK (close > 0),

    ADD CONSTRAINT chk_marketdata_previous_close_positive
        CHECK (previousClose > 0);