-- ============================================================
-- Base FL — 17) CaseUp: o editor consegue trocar e apagar as próprias imagens
--   Faltava a permissão de LER a própria pasta; sem ela, trocar/apagar era recusado.
-- Pode rodar mais de uma vez. Não apaga nada.
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute 'drop policy if exists "caseup le" on storage.objects';
    execute $q$ create policy "caseup le" on storage.objects for select to authenticated
      using (bucket_id = 'caseup' and (storage.foldername(name))[1] = md5(auth.uid()::text)) $q$;
  end if;
end $$;
select 'imagens do caseup liberadas' as resultado;
