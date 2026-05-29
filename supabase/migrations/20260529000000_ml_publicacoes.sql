CREATE TABLE ml_publicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ml_item_id text NOT NULL,
  catalogo_id uuid REFERENCES catalogos(id) ON DELETE SET NULL,
  sku_base text,
  titulo text,
  permalink text,
  status text,
  variations jsonb,
  ml_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, ml_item_id)
);

CREATE INDEX ml_publicacoes_user_catalogo_idx ON ml_publicacoes (user_id, catalogo_id);
CREATE INDEX ml_publicacoes_user_sku_idx ON ml_publicacoes (user_id, sku_base);

ALTER TABLE ml_publicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user selects own publicacoes"
  ON ml_publicacoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own publicacoes"
  ON ml_publicacoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own publicacoes"
  ON ml_publicacoes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
