-- Migration: trigger to bump conversas.atualizada_em on chat_historico insert
-- 2026-05-25

create or replace function tg_chat_historico_bump_conversa()
returns trigger language plpgsql as $$
begin
  if new.conversa_id is not null then
    update conversas set atualizada_em = now() where id = new.conversa_id;
  end if;
  return new;
end;
$$;

create trigger chat_historico_bump_conversa
after insert on chat_historico
for each row execute function tg_chat_historico_bump_conversa();
