-- Los Sauces: carga privada de documentos sin pedir cuenta ni PIN al visitante.
-- Requiere activar Authentication > Providers > Anonymous Sign-Ins.

alter table public.personas
  add column if not exists creado_por uuid references auth.users(id);

alter table public.documentos
  alter column drive_file_id drop not null;
alter table public.documentos
  add column if not exists storage_path text;
alter table public.documentos
  add constraint documentos_ubicacion_check
  check (drive_file_id is not null or storage_path is not null) not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expedientes', 'expedientes', false, 5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Visitante carga en su carpeta privada"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'expedientes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Visitante revisa sus archivos reci�n cargados"
on storage.objects for select to authenticated
using (
  bucket_id = 'expedientes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Administradores leen todos los expedientes"
on storage.objects for select to authenticated
using (bucket_id = 'expedientes' and public.es_administrador());

create policy "Administradores gestionan todos los expedientes"
on storage.objects for update to authenticated
using (bucket_id = 'expedientes' and public.es_administrador())
with check (bucket_id = 'expedientes' and public.es_administrador());

create or replace function public.registrar_persona(
  p_carnet text,
  p_nombre_completo text,
  p_fecha_nacimiento date,
  p_telefono text,
  p_direccion text,
  p_persona_apoyo text,
  p_tipo_discapacidad text,
  p_grado_discapacidad text,
  p_numero_carnet_discapacidad text,
  p_porcentaje smallint,
  p_fecha_afiliacion date
)
returns table(id uuid, registro text)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_numero bigint;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  if p_carnet !~ '^[0-9]{3,20}$' then raise exception 'CARNET_INVALIDO'; end if;
  if p_telefono !~ '^[0-9]{8,15}$' then raise exception 'TELEFONO_INVALIDO'; end if;
  if char_length(trim(p_nombre_completo)) not between 3 and 140 then raise exception 'NOMBRE_INVALIDO'; end if;

  insert into public.personas (
    carnet, nombre_completo, fecha_nacimiento, telefono, direccion, persona_apoyo,
    tipo_discapacidad, grado_discapacidad, numero_carnet_discapacidad,
    porcentaje, fecha_afiliacion, creado_por
  ) values (
    p_carnet, trim(p_nombre_completo), p_fecha_nacimiento, p_telefono,
    nullif(trim(p_direccion), ''), nullif(trim(p_persona_apoyo), ''),
    p_tipo_discapacidad, p_grado_discapacidad,
    nullif(p_numero_carnet_discapacidad, ''), p_porcentaje, p_fecha_afiliacion,
    auth.uid()
  ) returning personas.id, numero_registro into v_id, v_numero;

  insert into public.historial(persona_id, accion) values (v_id, 'Registro p�blico creado');
  return query select v_id, 'LS-' || lpad(v_numero::text, 6, '0');
exception when unique_violation then
  raise exception 'CARNET_YA_REGISTRADO';
end;
$$;

create or replace function public.registrar_documento(
  p_persona_id uuid,
  p_tipo text,
  p_lado text,
  p_nombre_archivo text,
  p_storage_path text,
  p_mime_type text
)
returns uuid
language plpgsql security definer
set search_path = public, storage, pg_temp
as $$
declare v_documento uuid;
begin
  if not exists (
    select 1 from public.personas
    where id = p_persona_id and creado_por = auth.uid()
  ) then raise exception 'REGISTRO_NO_AUTORIZADO'; end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'RUTA_NO_AUTORIZADA';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'expedientes' and name = p_storage_path and owner_id = auth.uid()::text
  ) then raise exception 'ARCHIVO_NO_ENCONTRADO'; end if;

  insert into public.documentos (
    persona_id, tipo, lado, nombre_archivo, storage_path, mime_type
  ) values (
    p_persona_id, p_tipo, coalesce(nullif(p_lado, ''), 'Completo'),
    p_nombre_archivo, p_storage_path, p_mime_type
  ) returning id into v_documento;
  return v_documento;
end;
$$;

grant execute on function public.registrar_documento(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.registrar_persona(text,text,date,text,text,text,text,text,text,smallint,date) to authenticated;
revoke execute on function public.registrar_persona(text,text,date,text,text,text,text,text,text,smallint,date) from anon;


