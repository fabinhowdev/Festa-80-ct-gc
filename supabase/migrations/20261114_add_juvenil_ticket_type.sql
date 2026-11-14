-- Mantém "crianca" para registros antigos e adiciona os tipos novos.
alter table public.pedidos
drop constraint if exists pedidos_tipo_ingresso_check;

alter table public.pedidos
add constraint pedidos_tipo_ingresso_check
check (tipo_ingresso in ('adulto', 'juvenil', 'infantil', 'crianca'));
