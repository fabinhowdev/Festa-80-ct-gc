create extension if not exists pgcrypto;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) >= 3),
  ct text not null check (char_length(trim(ct)) >= 2),
  whatsapp text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  status_pagamento text not null default 'pending'
    check (status_pagamento in ('pending', 'paid', 'canceled', 'refunded')),
  infinitepay_order_nsu text not null unique,
  infinitepay_transaction_nsu text unique,
  codigo_ingresso text unique,
  checkout_url text,
  pago_em timestamptz,
  usado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.checkins (
  id bigint generated always as identity primary key,
  pedido_id uuid not null unique references public.pedidos(id) on delete cascade,
  codigo_ingresso text not null,
  registrado_em timestamptz not null default now(),
  operador text
);

create or replace function public.registrar_checkin(p_codigo_ingresso text)
returns table (
  liberado boolean,
  mensagem text,
  pedido_id uuid,
  nome text,
  ct text,
  usado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido public.pedidos%rowtype;
begin
  select * into pedido
  from public.pedidos
  where codigo_ingresso = upper(trim(p_codigo_ingresso))
  for update;

  if not found then
    return query select false, 'Ingresso inválido.', null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  if pedido.status_pagamento <> 'paid' then
    return query select false, 'Pagamento ainda não confirmado.', pedido.id, pedido.nome, pedido.ct, pedido.usado_em;
    return;
  end if;

  if pedido.usado_em is not null then
    return query select false, 'Este ingresso já foi utilizado.', pedido.id, pedido.nome, pedido.ct, pedido.usado_em;
    return;
  end if;

  update public.pedidos
  set usado_em = now(), atualizado_em = now()
  where id = pedido.id
  returning * into pedido;

  insert into public.checkins (pedido_id, codigo_ingresso)
  values (pedido.id, pedido.codigo_ingresso);

  return query select true, 'Entrada liberada.', pedido.id, pedido.nome, pedido.ct, pedido.usado_em;
end;
$$;

alter table public.pedidos enable row level security;
alter table public.checkins enable row level security;

-- O navegador não acessa estas tabelas diretamente. Somente as Edge Functions
-- utilizam a service role para criar pedidos, confirmar pagamentos e registrar check-in.
