create index if not exists pedidos_status_pagamento_idx on public.pedidos (status_pagamento);
create index if not exists pedidos_whatsapp_idx on public.pedidos (whatsapp);
create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
