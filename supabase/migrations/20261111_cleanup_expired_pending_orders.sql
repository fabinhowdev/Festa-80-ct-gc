-- O checkout expira em 24 horas. A margem de duas horas garante que um link
-- nunca seja removido antes de a InfinitePay bloqueá-lo.
create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'limpar-pedidos-pendentes-expirados';

select cron.schedule(
  'limpar-pedidos-pendentes-expirados',
  '7 * * * *',
  $$
    delete from public.pedidos
    where status_pagamento = 'pending'
      and criado_em < now() - interval '26 hours';
  $$
);
