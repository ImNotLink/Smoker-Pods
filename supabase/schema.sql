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
-- 9. TRIGGER: handle_new_order
-- Dispara após INSERT em orders e reduz o estoque de cada sabor comprado.
-- Roda com SECURITY DEFINER (privilégio elevado) dentro da mesma transação
-- do INSERT — se o update falhar, o pedido também é revertido.
-- FOR UPDATE bloqueia a linha do pod e evita condição de corrida.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item          JSONB;
  pod_id        UUID;
  pod_flavor    TEXT;
  pod_qty       INTEGER;
  current_stock JSONB;
  new_qty       INTEGER;
  new_total     INTEGER;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    pod_id     := (item->>'id')::UUID;
    pod_flavor := item->>'flavor';
    pod_qty    := COALESCE((item->>'qty')::INTEGER, 1);

    IF pod_id IS NULL OR pod_flavor IS NULL THEN CONTINUE; END IF;

    SELECT flavor_stock INTO current_stock
    FROM public.pods
    WHERE id = pod_id
    FOR UPDATE;

    IF current_stock IS NULL THEN CONTINUE; END IF;

    new_qty       := GREATEST(0, COALESCE((current_stock ->> pod_flavor)::INTEGER, 0) - pod_qty);
    current_stock := jsonb_set(current_stock, ARRAY[pod_flavor], to_jsonb(new_qty));

    SELECT COALESCE(SUM(value::INTEGER), 0)
    INTO new_total
    FROM jsonb_each_text(current_stock);

    UPDATE public.pods
    SET flavor_stock = current_stock,
        stock_qty    = new_total
    WHERE id = pod_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_order ON public.orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();

-- =============================================================================
-- 10. TABELA: admin_users (controle de acesso e super admin)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  email      TEXT        PRIMARY KEY,
  role       TEXT        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_auth_select"          ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_super_admin_insert"   ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_super_admin_delete"   ON public.admin_users;

-- Qualquer admin autenticado pode ler (para checar o próprio role)
CREATE POLICY "admin_users_auth_select"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Apenas super_admin pode adicionar novos vendedores
CREATE POLICY "admin_users_super_admin_insert"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.email() AND au.role = 'super_admin'
    )
  );

-- Super_admin pode remover vendedores (mas não a si mesmo nem outro super_admin)
CREATE POLICY "admin_users_super_admin_delete"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (
    email <> auth.email()
    AND role <> 'super_admin'
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.email() AND au.role = 'super_admin'
    )
  );

-- !! IMPORTANTE: insira seu email como super_admin antes de usar a aba Equipe !!
-- INSERT INTO public.admin_users (email, role) VALUES ('seu@email.com', 'super_admin');

-- =============================================================================
-- 11. TABELA: reposicao (Tabelas de reposição de estoque)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reposicao (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  city       TEXT        NOT NULL DEFAULT 'Buriticupu',
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reposicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reposicao_auth_select" ON public.reposicao;
DROP POLICY IF EXISTS "reposicao_auth_insert" ON public.reposicao;
DROP POLICY IF EXISTS "reposicao_auth_update" ON public.reposicao;
DROP POLICY IF EXISTS "reposicao_auth_delete" ON public.reposicao;

CREATE POLICY "reposicao_auth_select"
  ON public.reposicao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "reposicao_auth_insert"
  ON public.reposicao FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "reposicao_auth_update"
  ON public.reposicao FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "reposicao_auth_delete"
  ON public.reposicao FOR DELETE
  TO authenticated USING (true);

-- =============================================================================
-- 12. TABELA: promo_schedule (Timer de promoção por horário)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.promo_schedule (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME        NOT NULL DEFAULT '12:00:00',
  end_time   TIME        NOT NULL DEFAULT '16:00:00',
  active     BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promo_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_schedule_public_select" ON public.promo_schedule;
DROP POLICY IF EXISTS "promo_schedule_auth_insert"   ON public.promo_schedule;
DROP POLICY IF EXISTS "promo_schedule_auth_update"   ON public.promo_schedule;

CREATE POLICY "promo_schedule_public_select"
  ON public.promo_schedule FOR SELECT USING (true);

CREATE POLICY "promo_schedule_auth_insert"
  ON public.promo_schedule FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "promo_schedule_auth_update"
  ON public.promo_schedule FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.promo_schedule (start_time, end_time, active)
SELECT '12:00:00', '16:00:00', false
WHERE NOT EXISTS (SELECT 1 FROM public.promo_schedule LIMIT 1);

-- =============================================================================
-- 8. ÍNDICES DE PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pods_cities       ON public.pods   USING GIN (cities);
CREATE INDEX IF NOT EXISTS idx_pods_on_sale      ON public.pods   (on_sale) WHERE on_sale = true;
CREATE INDEX IF NOT EXISTS idx_pods_stock_qty    ON public.pods   (stock_qty);
CREATE INDEX IF NOT EXISTS idx_pods_created_at   ON public.pods   (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_city       ON public.orders (city);
CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON public.orders    (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cities_active         ON public.cities    (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_reposicao_city        ON public.reposicao (city);
CREATE INDEX IF NOT EXISTS idx_reposicao_created_at  ON public.reposicao (created_at DESC);

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
