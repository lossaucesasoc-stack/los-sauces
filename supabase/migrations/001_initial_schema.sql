-- Los Sauces: estructura inicial y acceso público controlado.
-- Ejecutar una sola vez en Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.estado_expediente as enum ('Pendiente de revisión', 'Observado', 'Completo', 'Archivado');

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint generated always as identity unique,
  carnet text not null unique check (carnet ~ '^[0-9]{3,20}$'),
  nombre_completo text not null check (char_length(nombre_completo) between 3 and 140),
  fecha_nacimiento date,
  telefono text not null check (telefono ~ '^[0-9]{8,15}$'),
  direccion text,
  persona_apoyo text,
  tipo_discapacidad text not null,
  grado_discapacidad text not null,
  numero_carnet_discapacidad text check (numero_carnet_discapacidad is null or numero_carnet_discapacidad ~ '^[0-9]{1,30}$'),
  porcentaje smallint check (porcentaje between 0 and 100),
  fecha_afiliacion date,
  estado public.estado_expediente not null default 'Pendiente de revisión',
  observaciones_publicas text not null default '',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'carnet', 'certificado', 'discapacidad')),
  lado text not null default 'Completo' check (lado in ('Completo', 'Anverso', 'Reverso')),
  nombre_archivo text not null,
  drive_file_id text not null,
  mime_type text not null,
  vigente boolean not null default true,
  creado_en timestamptz not null default now()
);

create unique index documentos_vigentes_unicos
  on public.documentos(persona_id, tipo, lado) where vigente;

create table public.administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.historial (
  id bigint generated always as identity primary key,
  persona_id uuid not null references public.personas(id) on delete cascade,
  usuario_id uuid references auth.users(id),
  accion text not null,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

alter table public.personas enable row level security;
alter table public.documentos enable row level security;
alter table public.administradores enable row level security;
alter table public.historial enable row level security;

create or replace function public.es_administrador()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.administradores
    where usuario_id = auth.uid() and activo
  );
$$;

create policy "Administradores leen personas" on public.personas
  for select to authenticated using (public.es_administrador());
create policy "Administradores actualizan personas" on public.personas
  for update to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "Administradores leen documentos" on public.documentos
  for select to authenticated using (public.es_administrador());
create policy "Administradores gestionan documentos" on public.documentos
  for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "Administradores leen historial" on public.historial
  for select to authenticated using (public.es_administrador());
create policy "Administradores crean historial" on public.historial
  for insert to authenticated with check (public.es_administrador());
create policy "Administrador consulta su perfil" on public.administradores
  for select to authenticated using (usuario_id = auth.uid());

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
  if p_carnet !~ '^[0-9]{3,20}$' then raise exception 'CARNET_INVALIDO'; end if;
  if p_telefono !~ '^[0-9]{8,15}$' then raise exception 'TELEFONO_INVALIDO'; end if;
  if char_length(trim(p_nombre_completo)) not between 3 and 140 then raise exception 'NOMBRE_INVALIDO'; end if;

  insert into public.personas (
    carnet, nombre_completo, fecha_nacimiento, telefono, direccion, persona_apoyo,
    tipo_discapacidad, grado_discapacidad, numero_carnet_discapacidad,
    porcentaje, fecha_afiliacion
  ) values (
    p_carnet, trim(p_nombre_completo), p_fecha_nacimiento, p_telefono,
    nullif(trim(p_direccion), ''), nullif(trim(p_persona_apoyo), ''),
    p_tipo_discapacidad, p_grado_discapacidad,
    nullif(p_numero_carnet_discapacidad, ''), p_porcentaje, p_fecha_afiliacion
  ) returning personas.id, numero_registro into v_id, v_numero;

  insert into public.historial(persona_id, accion) values (v_id, 'Registro público creado');
  return query select v_id, 'LS-' || lpad(v_numero::text, 6, '0');
exception when unique_violation then
  raise exception 'CARNET_YA_REGISTRADO';
end;
$$;

create or replace function public.consultar_ficha(p_carnet text)
returns table(
  registro text, nombre_completo text, carnet text, fecha_nacimiento date,
  telefono text, direccion text, persona_apoyo text, tipo_discapacidad text,
  grado_discapacidad text, numero_carnet_discapacidad text, porcentaje smallint,
  fecha_afiliacion date, estado text, observaciones text
)
language sql stable security definer
set search_path = public
as $$
  select 'LS-' || lpad(p.numero_registro::text, 6, '0'), p.nombre_completo,
    p.carnet, p.fecha_nacimiento, p.telefono, p.direccion, p.persona_apoyo,
    p.tipo_discapacidad, p.grado_discapacidad, p.numero_carnet_discapacidad,
    p.porcentaje, p.fecha_afiliacion, p.estado::text, p.observaciones_publicas
  from public.personas p
  where p.carnet = p_carnet and p.activo
  limit 1;
$$;

revoke all on public.personas, public.documentos, public.administradores, public.historial from anon;
grant execute on function public.registrar_persona(text,text,date,text,text,text,text,text,text,smallint,date) to anon;
grant execute on function public.consultar_ficha(text) to anon;

