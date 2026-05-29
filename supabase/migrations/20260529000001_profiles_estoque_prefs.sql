alter table profiles
  add column pausar_sem_estoque boolean not null default false,
  add column notif_estoque boolean not null default true;
