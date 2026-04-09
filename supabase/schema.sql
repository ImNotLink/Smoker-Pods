-- =============================================================================
-- SMOKER PODS — Schema SQL Completo + Segurança
-- Execute no: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL: pods
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pods (
  id          UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT             NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  flavors     TEXT[]           NOT NULL DEFAULT '{}',
  price       NUMERIC(10, 2)   NOT NULL CHECK (price >= 0),
  promo_price NUMERIC(10, 2)   CHECK (promo_price IS NULL OR (promo_price >= 0 AND promo_price < price)),
  on_sale     BOOLEAN          NOT NULL DEFAULT false,
  image_url   TEXT,
  stock_qty   INTEGER          NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  created_at  TIMESTAMPTZ      DEFAULT NOW(),
  updated_at  TIMESTAMPTZ      DEFAULT NOW()
);

-- Índice para buscas por nome
CREATE INDEX IF NOT EXISTS idx_pods_name ON public.pods (name);

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
-- 5. DADOS DE EXEMPLO (remova após configurar produtos reais)
-- -----------------------------------------------------------------------------
INSERT INTO public.pods (name, flavors, price, promo_price, on_sale, stock_qty)
VALUES
  ('Ignite V80',      ARRAY['Menta', 'Morango', 'Uva', 'Manga'],            89.90, 69.90, true,  12),
  ('Ignite V400',     ARRAY['Menta Gelada', 'Blueberry', 'Tabaco'],         149.90, NULL, false,  3),
  ('ELF Bar BC5000',  ARRAY['Melancia', 'Kiwi', 'Limão'],                  119.90, 99.90, true,   0),
  ('VUSE GO 700',     ARRAY['Mango Ice', 'Berry Mix', 'Grape Frost'],        45.00, 39.90, true,   8),
  ('LOST MARY OS5000',ARRAY['Cherry Lemonade', 'Pineapple Coconut'],         69.90, 59.90, true,   2);

-- =============================================================================
-- CHECKLIST DE SEGURANÇA PÓS-EXECUÇÃO
-- =============================================================================
-- [ ] Confirme que RLS está ENABLED na tabela pods (Supabase → Table Editor → pods → RLS)
-- [ ] NUNCA exponha a "service_role key" no frontend (só anon key)
-- [ ] Em Authentication → Settings, desative "Enable email confirmations" apenas em dev
-- [ ] Ative "Leaked password protection" em Auth → Settings
-- [ ] Configure CORS em API Settings para aceitar apenas seu domínio em produção
-- =============================================================================
