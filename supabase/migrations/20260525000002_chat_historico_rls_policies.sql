create policy "chat_historico_select_own" on chat_historico
  for select using (auth.uid() = user_id);

create policy "chat_historico_insert_own" on chat_historico
  for insert with check (auth.uid() = user_id);

create policy "chat_historico_update_own" on chat_historico
  for update using (auth.uid() = user_id);

create policy "chat_historico_delete_own" on chat_historico
  for delete using (auth.uid() = user_id);
