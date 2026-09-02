-- SENAI Safe - migration incremental. Revisar e aplicar no Supabase SQL Editor.
create schema if not exists safe;
grant usage on schema safe to authenticated;

do $$
begin
  alter type hub.tipo_usuario add value if not exists 'safe_aqv';
  alter type hub.tipo_usuario add value if not exists 'safe_professor';
  alter type hub.tipo_usuario add value if not exists 'safe_portaria';
exception when undefined_object then
  raise exception 'Execute apos o schema hub.';
end $$;

alter table hub.aplicacoes drop constraint if exists aplicacoes_codigo_check;
alter table hub.aplicacoes add constraint aplicacoes_codigo_check
  check (codigo in ('senai_hub','senai_connect','senai_grid','senai_safe','connect','grid','safe'));

insert into hub.aplicacoes (codigo,slug,nome,name,descricao,description,route_path,icon,sort_order,ativo,is_active)
values ('senai_safe','senai-safe','SENAI Safe','SENAI Safe',
  'Autorizacoes de entrada e saida de alunos.','Student entry and exit authorizations.',
  '/safe','shield-check',3,true,true)
on conflict (codigo) do update set
  slug=excluded.slug,nome=excluded.nome,name=excluded.name,descricao=excluded.descricao,
  description=excluded.description,route_path=excluded.route_path,icon=excluded.icon,
  sort_order=excluded.sort_order,ativo=true,is_active=true;

do $$ begin create type safe.tipo_autorizacao as enum ('entrada','saida');
exception when duplicate_object then null; end $$;
do $$ begin create type safe.status_autorizacao as enum
  ('pendente_aqv','aguardando_professor','liberado_portaria','finalizado','negado');
exception when duplicate_object then null; end $$;

create sequence if not exists safe.protocolo_sequence;
create table if not exists safe.autorizacoes (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  aluno_id uuid references connect.alunos(id) on delete set null,
  aluno_nome text not null,
  turma_nome text not null,
  tipo safe.tipo_autorizacao not null,
  motivo text not null check (char_length(trim(motivo)) between 1 and 2000),
  quantidade_faltas smallint check (quantidade_faltas between 0 and 5),
  agendada_em timestamptz not null,
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  status safe.status_autorizacao not null default 'pendente_aqv',
  solicitada_por uuid not null references hub.usuarios(id) on delete restrict,
  aprovada_por_professor uuid references hub.usuarios(id) on delete set null,
  aprovada_por_portaria uuid references hub.usuarios(id) on delete set null,
  aprovada_professor_em timestamptz,
  confirmada_portaria_em timestamptz,
  finalizada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists safe.logs_autorizacao (
  id uuid primary key default gen_random_uuid(),
  autorizacao_id uuid not null references safe.autorizacoes(id) on delete cascade,
  acao text not null check (char_length(trim(acao)) between 1 and 500),
  usuario_id uuid references hub.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists safe_autorizacoes_status_agendada_idx on safe.autorizacoes(status,agendada_em desc);
create index if not exists safe_autorizacoes_aluno_idx on safe.autorizacoes(aluno_id,created_at desc);
create index if not exists safe_logs_autorizacao_idx on safe.logs_autorizacao(autorizacao_id,created_at);
drop trigger if exists safe_autorizacoes_updated_at on safe.autorizacoes;
create trigger safe_autorizacoes_updated_at before update on safe.autorizacoes
for each row execute function hub.set_updated_at();

create or replace function safe.is_aqv() returns boolean language sql stable as $$
  select hub.is_active_user() and hub.current_user_role()::text in ('admin','direcao','safe_aqv');
$$;
create or replace function safe.is_professor() returns boolean language sql stable as $$
  select hub.is_active_user() and hub.current_user_role()::text in ('professor','connect_professor','safe_professor');
$$;
create or replace function safe.is_portaria() returns boolean language sql stable as $$
  select hub.is_active_user() and hub.current_user_role()::text='safe_portaria';
$$;
create or replace function safe.professor_responsavel_por_aluno(p_aluno_id uuid)
returns boolean language sql stable security definer
set search_path=safe,connect,hub,public as $$
  select safe.is_professor() and exists (
    select 1 from connect.alunos a
    join connect.professor_turmas pt on pt.turma_id=a.turma_id and pt.ativo
    join connect.professores p on p.id=pt.professor_id
    where a.id=p_aluno_id and p.usuario_id=auth.uid()
  );
$$;

-- Aprovado: AQV Safe consulta alunos e turmas Connect para criar autorizacoes.
drop policy if exists alunos_safe_aqv_read on connect.alunos;
create policy alunos_safe_aqv_read on connect.alunos for select to authenticated using (safe.is_aqv());
drop policy if exists turmas_safe_aqv_read on connect.turmas;
create policy turmas_safe_aqv_read on connect.turmas for select to authenticated using (safe.is_aqv());

alter table safe.autorizacoes enable row level security;
alter table safe.logs_autorizacao enable row level security;
drop policy if exists safe_autorizacoes_select on safe.autorizacoes;
create policy safe_autorizacoes_select on safe.autorizacoes for select to authenticated using (
  safe.is_aqv()
  or (safe.is_portaria() and status='liberado_portaria')
  or (status='aguardando_professor' and safe.professor_responsavel_por_aluno(aluno_id))
);
drop policy if exists safe_logs_select on safe.logs_autorizacao;
create policy safe_logs_select on safe.logs_autorizacao for select to authenticated using (
  exists (select 1 from safe.autorizacoes a where a.id=logs_autorizacao.autorizacao_id)
);

create or replace function safe.criar_autorizacao(
  p_aluno_id uuid,p_tipo safe.tipo_autorizacao,p_motivo text,p_agendada_em timestamptz,
  p_quantidade_faltas smallint default null,p_observacoes text default null
) returns safe.autorizacoes language plpgsql security definer
set search_path=safe,connect,hub,public as $$
declare v_aluno record; v_result safe.autorizacoes;
begin
  if not safe.is_aqv() then raise exception 'Sem permissao.' using errcode='42501'; end if;
  select a.id,a.nome,t.nome as turma_nome into v_aluno
  from connect.alunos a left join connect.turmas t on t.id=a.turma_id where a.id=p_aluno_id;
  if not found then raise exception 'Aluno nao encontrado.' using errcode='P0002'; end if;
  insert into safe.autorizacoes(protocolo,aluno_id,aluno_nome,turma_nome,tipo,motivo,quantidade_faltas,agendada_em,observacoes,status,solicitada_por)
  values ('SAF'||to_char(now(),'YYYY')||'-'||lpad(nextval('safe.protocolo_sequence')::text,5,'0'),
    v_aluno.id,v_aluno.nome,coalesce(v_aluno.turma_nome,'Sem turma'),p_tipo,trim(p_motivo),
    p_quantidade_faltas,p_agendada_em,nullif(trim(p_observacoes),''),'aguardando_professor',auth.uid())
  returning * into v_result;
  insert into safe.logs_autorizacao(autorizacao_id,acao,usuario_id)
  values(v_result.id,'Solicitacao criada pela AQV',auth.uid());
  return v_result;
end $$;

create or replace function safe.decidir_professor(p_id uuid,p_aprovar boolean)
returns safe.autorizacoes language plpgsql security definer
set search_path=safe,connect,hub,public as $$
declare v safe.autorizacoes;
begin
  select * into v from safe.autorizacoes where id=p_id for update;
  if not found then raise exception 'Autorizacao nao encontrada.' using errcode='P0002'; end if;
  if v.status<>'aguardando_professor' or not safe.professor_responsavel_por_aluno(v.aluno_id)
    then raise exception 'Sem permissao ou estado invalido.' using errcode='42501'; end if;
  update safe.autorizacoes set status=case when not p_aprovar then 'negado'::safe.status_autorizacao
    when v.tipo='entrada' then 'finalizado'::safe.status_autorizacao else 'liberado_portaria'::safe.status_autorizacao end,
    aprovada_por_professor=auth.uid(),aprovada_professor_em=now(),
    finalizada_em=case when p_aprovar and v.tipo='entrada' then now() else null end
  where id=p_id returning * into v;
  insert into safe.logs_autorizacao(autorizacao_id,acao,usuario_id)
  values(v.id,case when p_aprovar then 'Professor aprovou solicitacao' else 'Professor negou solicitacao' end,auth.uid());
  return v;
end $$;

create or replace function safe.decidir_portaria(p_id uuid,p_aprovar boolean)
returns safe.autorizacoes language plpgsql security definer
set search_path=safe,hub,public as $$
declare v safe.autorizacoes;
begin
  if not safe.is_portaria() then raise exception 'Sem permissao.' using errcode='42501'; end if;
  select * into v from safe.autorizacoes where id=p_id for update;
  if not found then raise exception 'Autorizacao nao encontrada.' using errcode='P0002'; end if;
  if v.status<>'liberado_portaria' or v.tipo<>'saida' then raise exception 'Estado invalido.' using errcode='22023'; end if;
  update safe.autorizacoes set status=case when p_aprovar then 'finalizado'::safe.status_autorizacao else 'negado'::safe.status_autorizacao end,
    aprovada_por_portaria=auth.uid(),confirmada_portaria_em=now(),
    finalizada_em=case when p_aprovar then now() else null end where id=p_id returning * into v;
  insert into safe.logs_autorizacao(autorizacao_id,acao,usuario_id)
  values(v.id,case when p_aprovar then 'Portaria validou saida' else 'Portaria recusou saida' end,auth.uid());
  return v;
end $$;

revoke all on safe.autorizacoes,safe.logs_autorizacao from authenticated;
grant select on safe.autorizacoes,safe.logs_autorizacao to authenticated;
grant usage,select on sequence safe.protocolo_sequence to authenticated;
grant execute on function safe.criar_autorizacao(uuid,safe.tipo_autorizacao,text,timestamptz,smallint,text) to authenticated;
grant execute on function safe.decidir_professor(uuid,boolean) to authenticated;
grant execute on function safe.decidir_portaria(uuid,boolean) to authenticated;
