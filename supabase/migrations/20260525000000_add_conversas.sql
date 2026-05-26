-- Migration: add conversas table and conversa_id refs for chat history
-- 2026-05-25

-- ── 1. Tabela conversas ───────────────────────────────────────────────────────

create table conversas (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  titulo        text,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  arquivada     boolean     not null default false
);

create index on conversas (user_id, atualizada_em desc);

-- Trigger: mantém atualizada_em sincronizado automaticamente
create or replace function tg_conversas_set_atualizada_em()
returns trigger language plpgsql as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

create trigger conversas_set_atualizada_em
before update on conversas
for each row execute function tg_conversas_set_atualizada_em();

-- RLS
alter table conversas enable row level security;

create policy "conversas_select_own" on conversas
  for select using (auth.uid() = user_id);

create policy "conversas_insert_own" on conversas
  for insert with check (auth.uid() = user_id);

create policy "conversas_update_own" on conversas
  for update using (auth.uid() = user_id);

create policy "conversas_delete_own" on conversas
  for delete using (auth.uid() = user_id);

-- ── 2. chat_historico: coluna conversa_id ────────────────────────────────────

alter table chat_historico
  add column conversa_id uuid references conversas(id) on delete cascade;

create index on chat_historico (conversa_id, criado_em asc);

-- ── 3. sessoes_geracao: coluna conversa_id ───────────────────────────────────

alter table sessoes_geracao
  add column conversa_id uuid references conversas(id) on delete set null;
