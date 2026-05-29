CREATE TABLE bling_ml_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bling_sku text NOT NULL,
  ml_item_id text NOT NULL,
  ml_variation_id bigint,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bling_sku)
);

ALTER TABLE bling_ml_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manages own bling_ml_mapping"
  ON bling_ml_mapping
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
