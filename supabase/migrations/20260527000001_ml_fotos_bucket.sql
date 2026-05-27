INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-fotos', 'ml-fotos', true)
ON CONFLICT (id) DO NOTHING;
