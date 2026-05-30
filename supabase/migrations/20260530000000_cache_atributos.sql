ALTER TABLE produtos_cache
  ADD COLUMN IF NOT EXISTS atributos jsonb;
