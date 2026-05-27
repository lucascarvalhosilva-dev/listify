CREATE TABLE ml_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ml_user_id text NOT NULL,
  nickname text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE ml_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own row"
  ON ml_contas
  FOR ALL
  USING (auth.uid() = user_id);
