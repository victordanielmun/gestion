-- =============================================================================
-- SCHEMA: Sistema de Inventario y Ventas - Colombia
-- Motor: PostgreSQL 15+
-- Convenciones:
--   - UUIDs como PK (gen_random_uuid())
--   - Todos los precios en NUMERIC(15,2) para evitar errores de punto flotante
--   - Soft delete via deleted_at (no se borra nada, solo se marca)
--   - updated_at se actualiza automáticamente via trigger
--   - Índices en todas las FKs y columnas de búsqueda frecuente
-- =============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- FUNCIÓN UTILITARIA: actualizar updated_at automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- MÓDULO 1: USUARIOS Y CONTROL DE ACCESO
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    -- Permisos como JSON: {"sales": true, "inventory": true, "admin": false}
    permissions JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);

CREATE TRIGGER set_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role_id       UUID        NOT NULL REFERENCES roles(id),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Para refresh tokens: almacenar hash del token vigente
    refresh_token_hash TEXT,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_id    ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- MÓDULO 2: ALMACENES
-- =============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    address     TEXT,
    city        VARCHAR(100),
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_warehouses_deleted_at ON warehouses(deleted_at);

CREATE TRIGGER set_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- Pivot: qué almacenes puede gestionar cada usuario
CREATE TABLE IF NOT EXISTS user_warehouses (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_user_warehouses_warehouse ON user_warehouses(warehouse_id);


-- =============================================================================
-- MÓDULO 3: CATÁLOGO (CATEGORÍAS Y PRODUCTOS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    -- Soporte para subcategorías: NULL = categoría raíz
    parent_id   UUID         REFERENCES categories(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id  ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS products (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200)    NOT NULL,
    description     TEXT,
    reference       VARCHAR(100)    UNIQUE,         -- referencia interna
    barcode         VARCHAR(100)    UNIQUE,         -- código de barras EAN/UPC
    purchase_price  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    sale_price      NUMERIC(15,2)   NOT NULL DEFAULT 0,
    -- IVA en porcentaje: 0, 5 ó 19 (Colombia)
    iva_pct         NUMERIC(5,2)    NOT NULL DEFAULT 19.00,
    expiration_date DATE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_barcode    ON products(barcode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_reference  ON products(reference) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
-- Búsqueda full-text por nombre
CREATE INDEX IF NOT EXISTS idx_products_name_fts   ON products USING gin(to_tsvector('spanish', name));

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- Pivot: un producto puede tener varias categorías
CREATE TABLE IF NOT EXISTS product_categories (
    product_id  UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);


-- =============================================================================
-- MÓDULO 4: INVENTARIO (STOCK POR ALMACÉN)
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID          NOT NULL REFERENCES products(id),
    warehouse_id UUID          NOT NULL REFERENCES warehouses(id),
    quantity     NUMERIC(15,3) NOT NULL DEFAULT 0,   -- 3 decimales para productos a granel
    min_quantity NUMERIC(15,3) NOT NULL DEFAULT 0,   -- alerta de stock mínimo
    location     VARCHAR(100),                        -- ej. "Pasillo A - Estante 3"
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product   ON inventory(product_id);


-- Libro contable de movimientos de inventario (inmutable, nunca se borra)
-- movement_type: ENTRY | SALE | RETURN | ADJUSTMENT | TRANSFER_IN | TRANSFER_OUT
-- reference_type: inventory_entry | sale | credit_note | adjustment | transfer
CREATE TABLE IF NOT EXISTS inventory_movements (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID          NOT NULL REFERENCES products(id),
    warehouse_id   UUID          NOT NULL REFERENCES warehouses(id),
    movement_type  VARCHAR(20)   NOT NULL,
    -- Siempre positivo; el tipo indica si suma o resta
    quantity       NUMERIC(15,3) NOT NULL,
    -- Costo unitario en el momento del movimiento (para valorización de inventario)
    unit_cost      NUMERIC(15,2) NOT NULL DEFAULT 0,
    -- Referencia al documento que originó el movimiento
    reference_id   UUID          NOT NULL,
    reference_type VARCHAR(30)   NOT NULL,
    user_id        UUID          REFERENCES users(id),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product   ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_reference ON inventory_movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_movements_date      ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type      ON inventory_movements(movement_type);


-- =============================================================================
-- MÓDULO 5: CLIENTES
-- =============================================================================

-- id_type: CC | NIT | CE | PP | DIE (tipos de identificación Colombia)
-- client_type: PERSONA_NATURAL | PERSONA_JURIDICA
CREATE TABLE IF NOT EXISTS clients (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    id_type     VARCHAR(10)  NOT NULL DEFAULT 'CC',
    id_number   VARCHAR(30)  NOT NULL,
    email       VARCHAR(150),
    phone       VARCHAR(20),
    mobile      VARCHAR(20),
    address     TEXT,
    city        VARCHAR(100),
    client_type VARCHAR(20)  NOT NULL DEFAULT 'PERSONA_NATURAL',
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (id_type, id_number)
);

CREATE INDEX IF NOT EXISTS idx_clients_id_number  ON clients(id_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_email      ON clients(email)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_name_fts   ON clients USING gin(to_tsvector('spanish', name));

CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- MÓDULO 6: INGRESOS DE INVENTARIO (COMPRAS / ENTRADAS)
-- =============================================================================

-- status: DRAFT | CONFIRMED | CANCELLED
CREATE TABLE IF NOT EXISTS inventory_entries (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    user_id      UUID        NOT NULL REFERENCES users(id),
    date         DATE        NOT NULL DEFAULT CURRENT_DATE,
    status       VARCHAR(15) NOT NULL DEFAULT 'DRAFT',
    notes        TEXT,
    total        NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_entries_warehouse  ON inventory_entries(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_entries_user       ON inventory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_date       ON inventory_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON inventory_entries(deleted_at);

CREATE TRIGGER set_entries_updated_at
    BEFORE UPDATE ON inventory_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS entry_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id       UUID          NOT NULL REFERENCES inventory_entries(id) ON DELETE CASCADE,
    product_id     UUID          NOT NULL REFERENCES products(id),
    quantity       NUMERIC(15,3) NOT NULL,
    purchase_price NUMERIC(15,2) NOT NULL,
    total          NUMERIC(15,2) NOT NULL GENERATED ALWAYS AS (quantity * purchase_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_entry_items_entry   ON entry_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_items_product ON entry_items(product_id);


-- =============================================================================
-- MÓDULO 7: COTIZACIONES
-- =============================================================================

-- status: DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CONVERTED
CREATE TABLE IF NOT EXISTS quotes (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID          NOT NULL REFERENCES clients(id),
    user_id         UUID          NOT NULL REFERENCES users(id),
    warehouse_id    UUID          NOT NULL REFERENCES warehouses(id),
    date            DATE          NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax             NUMERIC(15,2) NOT NULL DEFAULT 0,
    total           NUMERIC(15,2) NOT NULL DEFAULT 0,
    status          VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quotes_client      ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user        ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_date        ON quotes(date);
CREATE INDEX IF NOT EXISTS idx_quotes_status      ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at  ON quotes(deleted_at);

CREATE TRIGGER set_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS quote_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id     UUID          NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES products(id),
    quantity     NUMERIC(15,3) NOT NULL,
    unit_price   NUMERIC(15,2) NOT NULL,
    iva_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    iva          NUMERIC(15,2) NOT NULL DEFAULT 0,
    total        NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote   ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id);


-- =============================================================================
-- MÓDULO 8: VENTAS / RECIBOS
-- =============================================================================

-- status: OPEN | PAID | PARTIALLY_PAID | CANCELLED | REFUNDED
-- payment_method: CASH | CARD | TRANSFER | CREDIT | MIXED
CREATE TABLE IF NOT EXISTS sales (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id      UUID          NOT NULL REFERENCES clients(id),
    seller_id      UUID          NOT NULL REFERENCES users(id),
    warehouse_id   UUID          NOT NULL REFERENCES warehouses(id),
    -- Nulo si la venta no viene de una cotización
    quote_id       UUID          REFERENCES quotes(id),
    date           DATE          NOT NULL DEFAULT CURRENT_DATE,
    subtotal       NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount       NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax            NUMERIC(15,2) NOT NULL DEFAULT 0,
    total          NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_paid    NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20)   NOT NULL DEFAULT 'CASH',
    status         VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sales_client      ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller      ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_warehouse   ON sales(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_quote       ON sales(quote_id);
CREATE INDEX IF NOT EXISTS idx_sales_date        ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_status      ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at  ON sales(deleted_at);

CREATE TRIGGER set_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS sale_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id      UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES products(id),
    quantity     NUMERIC(15,3) NOT NULL,
    unit_price   NUMERIC(15,2) NOT NULL,
    iva_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    iva          NUMERIC(15,2) NOT NULL DEFAULT 0,
    total        NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);


-- =============================================================================
-- MÓDULO 9: FACTURACIÓN ELECTRÓNICA (DIAN)
-- =============================================================================

-- dian_status: PENDING | SENT | ACCEPTED | REJECTED | CONTINGENCY
-- status:      DRAFT | ISSUED | CANCELLED
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         UUID          NOT NULL REFERENCES sales(id),
    -- Número consecutivo asignado por la empresa (ej. FE-0001)
    invoice_number  VARCHAR(20)   NOT NULL UNIQUE,
    -- CUFE: Código Único de Factura Electrónica (generado por DIAN)
    cufe            VARCHAR(256)  UNIQUE,
    date            DATE          NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax             NUMERIC(15,2) NOT NULL DEFAULT 0,
    total           NUMERIC(15,2) NOT NULL DEFAULT 0,
    status          VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
    dian_status     VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    -- XML firmado enviado a la DIAN
    xml_content     TEXT,
    -- URL del PDF del documento
    pdf_url         TEXT,
    -- Respuesta cruda de la DIAN para auditoría
    dian_response   JSONB,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_sale           ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date           ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_dian_status    ON invoices(dian_status);

CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS invoice_items (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id  UUID          NOT NULL REFERENCES products(id),
    quantity    NUMERIC(15,3) NOT NULL,
    unit_price  NUMERIC(15,2) NOT NULL,
    iva_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount    NUMERIC(15,2) NOT NULL DEFAULT 0,
    iva         NUMERIC(15,2) NOT NULL DEFAULT 0,
    total       NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);


-- =============================================================================
-- MÓDULO 10: NOTAS CRÉDITO
-- Reducen el valor de una factura emitida.
-- Casos: devolución de mercancía, descuento post-factura, anulación.
-- Códigos DIAN: 01=Dev.parcial, 02=Anulación, 03=Rebaja, 04=Ajuste precio, 05=Otros
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_notes (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    UUID          NOT NULL REFERENCES invoices(id),
    number        VARCHAR(20)   NOT NULL UNIQUE,   -- ej. NC-0001
    cufe          VARCHAR(256)  UNIQUE,
    -- Código y descripción del motivo según la DIAN
    reason_code   VARCHAR(5)    NOT NULL,
    reason_desc   TEXT          NOT NULL,
    date          DATE          NOT NULL DEFAULT CURRENT_DATE,
    subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount      NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax           NUMERIC(15,2) NOT NULL DEFAULT 0,
    total         NUMERIC(15,2) NOT NULL DEFAULT 0,
    status        VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
    dian_status   VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    xml_content   TEXT,
    pdf_url       TEXT,
    dian_response JSONB,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice     ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date        ON credit_notes(date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_dian_status ON credit_notes(dian_status);

CREATE TRIGGER set_credit_notes_updated_at
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS credit_note_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID          NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id     UUID          NOT NULL REFERENCES products(id),
    quantity       NUMERIC(15,3) NOT NULL,
    unit_price     NUMERIC(15,2) NOT NULL,
    iva_pct        NUMERIC(5,2)  NOT NULL DEFAULT 0,
    iva            NUMERIC(15,2) NOT NULL DEFAULT 0,
    total          NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_note    ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product ON credit_note_items(product_id);


-- =============================================================================
-- MÓDULO 11: NOTAS DÉBITO
-- Aumentan el valor de una factura emitida.
-- Casos: cobro adicional, corrección de precio al alza, intereses por mora.
-- Códigos DIAN: 01=Intereses, 02=Gastos por cobrar, 03=Cambio valor
-- =============================================================================

CREATE TABLE IF NOT EXISTS debit_notes (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    UUID          NOT NULL REFERENCES invoices(id),
    number        VARCHAR(20)   NOT NULL UNIQUE,   -- ej. ND-0001
    cufe          VARCHAR(256)  UNIQUE,
    reason_code   VARCHAR(5)    NOT NULL,
    reason_desc   TEXT          NOT NULL,
    date          DATE          NOT NULL DEFAULT CURRENT_DATE,
    subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax           NUMERIC(15,2) NOT NULL DEFAULT 0,
    total         NUMERIC(15,2) NOT NULL DEFAULT 0,
    status        VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
    dian_status   VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    xml_content   TEXT,
    pdf_url       TEXT,
    dian_response JSONB,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_invoice     ON debit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_date        ON debit_notes(date);
CREATE INDEX IF NOT EXISTS idx_debit_notes_dian_status ON debit_notes(dian_status);

CREATE TRIGGER set_debit_notes_updated_at
    BEFORE UPDATE ON debit_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


CREATE TABLE IF NOT EXISTS debit_note_items (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_note_id UUID          NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
    product_id    UUID          NOT NULL REFERENCES products(id),
    quantity      NUMERIC(15,3) NOT NULL,
    unit_price    NUMERIC(15,2) NOT NULL,
    iva_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
    iva           NUMERIC(15,2) NOT NULL DEFAULT 0,
    total         NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_debit_note_items_note    ON debit_note_items(debit_note_id);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_product ON debit_note_items(product_id);


-- =============================================================================
-- DATOS SEMILLA MÍNIMOS
-- =============================================================================

-- Roles básicos del sistema
INSERT INTO roles (name, permissions) VALUES
    ('admin',     '{"users":true,"roles":true,"warehouses":true,"products":true,"inventory":true,"sales":true,"invoices":true,"reports":true}'),
    ('vendedor',  '{"users":false,"roles":false,"warehouses":false,"products":true,"inventory":false,"sales":true,"invoices":false,"reports":false}'),
    ('bodeguero', '{"users":false,"roles":false,"warehouses":true,"products":true,"inventory":true,"sales":false,"invoices":false,"reports":false}'),
    ('contador',  '{"users":false,"roles":false,"warehouses":false,"products":false,"inventory":false,"sales":true,"invoices":true,"reports":true}')
ON CONFLICT (name) DO NOTHING;
