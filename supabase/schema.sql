-- =============================================================================
-- SMOKER PODS — Schema SQL Completo + Segurança
-- Execute no: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL: pods
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pods (
  id           UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT             NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  flavors      TEXT[]           NOT NULL DEFAULT '{}',
  price        NUMERIC(10, 2)   NOT NULL CHECK (price >= 0),
  promo_price  NUMERIC(10, 2)   CHECK (promo_price IS NULL OR (promo_price >= 0 AND promo_price < price)),
  on_sale      BOOLEAN          NOT NULL DEFAULT false,
  image_url    TEXT,
  city         TEXT             NOT NULL DEFAULT 'Buriticupu',
  cities       TEXT[]           DEFAULT '{}',
  stock_qty    INTEGER          NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  flavor_stock JSONB            DEFAULT '{}',
  created_at   TIMESTAMPTZ      DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      DEFAULT NOW()
);

-- Índice para buscas por nome
CREATE INDEX IF NOT EXISTS idx_pods_name ON public.pods (name);

-- Garante que colunas existam em bancos já criados
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS city         TEXT    NOT NULL DEFAULT 'Buriticupu';
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS cities       TEXT[]           DEFAULT '{}';
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS flavor_stock JSONB            DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- 2. TRIGGER: atualiza updated_at automaticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_pods_updated_at ON public.pods;
CREATE TRIGGER set_pods_updated_at
  BEFORE UPDATE ON public.pods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) — Coração da segurança backend
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Com RLS ativo, NENHUMA query funciona sem uma policy explícita.
-- Mesmo que alguém descubra sua anon key, não consegue fazer INSERT/UPDATE/DELETE.

ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pods_public_select" ON public.pods;
DROP POLICY IF EXISTS "pods_auth_insert"   ON public.pods;
DROP POLICY IF EXISTS "pods_auth_update"   ON public.pods;
DROP POLICY IF EXISTS "pods_auth_delete"   ON public.pods;

-- Leitura pública: qualquer visitante pode ver os produtos
CREATE POLICY "pods_public_select"
  ON public.pods FOR SELECT
  USING (true);

-- Escrita restrita: somente usuários autenticados (admins) podem modificar
CREATE POLICY "pods_auth_insert"
  ON public.pods FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pods_auth_update"
  ON public.pods FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "pods_auth_delete"
  ON public.pods FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- 4. STORAGE: Bucket "pod-images"
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pod-images',
  'pod-images',
  true,
  5242880,  -- 5MB máximo por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies do Storage
DROP POLICY IF EXISTS "storage_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_upload"   ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_delete"   ON storage.objects;

CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pod-images');

CREATE POLICY "storage_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pod-images');

CREATE POLICY "storage_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pod-images');

CREATE POLICY "storage_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pod-images');

-- -----------------------------------------------------------------------------
-- 5. DADOS DE EXEMPLO — só insere se a tabela estiver vazia
-- -----------------------------------------------------------------------------
INSERT INTO public.pods (name, flavors, price, promo_price, on_sale, stock_qty)
SELECT * FROM (VALUES
  ('Ignite V80',       ARRAY['Menta', 'Morango', 'Uva', 'Manga'],           89.90::NUMERIC, 69.90::NUMERIC, true,  12),
  ('Ignite V400',      ARRAY['Menta Gelada', 'Blueberry', 'Tabaco'],       149.90::NUMERIC, NULL,           false,  3),
  ('ELF Bar BC5000',   ARRAY['Melancia', 'Kiwi', 'Limão'],                 119.90::NUMERIC, 99.90::NUMERIC, true,   0),
  ('VUSE GO 700',      ARRAY['Mango Ice', 'Berry Mix', 'Grape Frost'],      45.00::NUMERIC, 39.90::NUMERIC, true,   8),
  ('LOST MARY OS5000', ARRAY['Cherry Lemonade', 'Pineapple Coconut'],       69.90::NUMERIC, 59.90::NUMERIC, true,   2)
) AS v(name, flavors, price, promo_price, on_sale, stock_qty)
WHERE NOT EXISTS (SELECT 1 FROM public.pods LIMIT 1);

-- =============================================================================
-- 6. TABELA: orders (Pedidos via WhatsApp)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  items      JSONB          NOT NULL DEFAULT '[]',
  total      NUMERIC(10,2)  NOT NULL CHECK (total >= 0),
  payment    TEXT           NOT NULL,
  how_found  TEXT           NOT NULL,
  city       TEXT           NOT NULL DEFAULT 'Buriticupu',
  status     TEXT           NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ    DEFAULT NOW()
);

-- Garante que colunas existam em tabelas orders já criadas anteriormente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city   TEXT NOT NULL DEFAULT 'Buriticupu';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_select"   ON public.orders;
DROP POLICY IF EXISTS "orders_auth_update"   ON public.orders;
DROP POLICY IF EXISTS "orders_auth_delete"   ON public.orders;

-- Visitantes podem criar pedidos (checkout sem login)
CREATE POLICY "orders_public_insert"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Apenas admins podem ler, atualizar e excluir pedidos
CREATE POLICY "orders_auth_select"
  ON public.orders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "orders_auth_update"
  ON public.orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "orders_auth_delete"
  ON public.orders FOR DELETE
  TO authenticated USING (true);

-- =============================================================================
-- 7. TABELA: cities (Cidades atendidas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cities (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  active     BOOLEAN     NOT NULL DEFAULT true,
  whatsapp   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_public_select" ON public.cities;
DROP POLICY IF EXISTS "cities_auth_all"      ON public.cities;

-- Visitantes podem ler cidades ativas
CREATE POLICY "cities_public_select"
  ON public.cities FOR SELECT
  USING (active = true);

-- Apenas admins podem gerenciar cidades
CREATE POLICY "cities_auth_all"
  ON public.cities FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Cidades iniciais
INSERT INTO public.cities (name, whatsapp) VALUES
  ('Buriticupu',    '559991036173'),
  ('Imperatriz',    NULL),
  ('Rondon do Pará', NULL)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 8. ÍNDICES DE PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pods_cities       ON public.pods   USING GIN (cities);
CREATE INDEX IF NOT EXISTS idx_pods_on_sale      ON public.pods   (on_sale) WHERE on_sale = true;
CREATE INDEX IF NOT EXISTS idx_pods_stock_qty    ON public.pods   (stock_qty);
CREATE INDEX IF NOT EXISTS idx_pods_created_at   ON public.pods   (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_city       ON public.orders (city);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cities_active     ON public.cities (active) WHERE active = true;

-- =============================================================================
-- CHECKLIST DE SEGURANÇA PÓS-EXECUÇÃO
-- =============================================================================
-- [ ] Confirme que RLS está ENABLED nas tabelas pods, orders e cities
-- [ ] NUNCA exponha a "service_role key" no frontend (só anon key)
-- [ ] Em Authentication → Settings, desative "Enable email confirmations" apenas em dev
-- [ ] Ative "Leaked password protection" em Auth → Settings
-- [ ] Configure CORS em API Settings para aceitar apenas seu domínio em produção
-- [ ] Defina NEXT_PUBLIC_WHATSAPP_NUMBER no .env.local e no Vercel
-- =============================================================================
