CREATE TABLE ml_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id text NOT NULL,
  domain_id text NOT NULL,
  genero text NOT NULL,
  grid_id text NOT NULL,
  rows jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, domain_id, genero)
);

ALTER TABLE ml_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user selects own grades"
  ON ml_grades
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own grades"
  ON ml_grades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own grades"
  ON ml_grades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
