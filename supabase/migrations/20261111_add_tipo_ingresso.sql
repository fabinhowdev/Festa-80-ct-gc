alter table public.pedidos
add column if not exists tipo_ingresso text not null default 'adulto'
  check (tipo_ingresso in ('crianca', 'adulto'));
