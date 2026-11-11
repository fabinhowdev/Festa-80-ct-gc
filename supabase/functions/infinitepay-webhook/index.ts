import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function response(status = 200) {
  return new Response(null, { status });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response(405);
  if (req.url.searchParams.get("secret") !== Deno.env.get("INFINITEPAY_WEBHOOK_SECRET")) {
    return response(401);
  }

  try {
    const payload = await req.json();
    const event = String(payload.event ?? payload.type ?? payload.status ?? "").toLowerCase();
    const orderNsu = payload.order_nsu ?? payload.order?.order_nsu ?? payload.data?.order_nsu;
    const transactionNsu = payload.transaction_nsu ?? payload.transaction?.nsu ?? payload.data?.transaction_nsu ?? null;

    if (!orderNsu) return response(400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event === "paid") {
      const ticketCode = `CT80-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      const { error } = await supabase
        .from("pedidos")
        .update({
          status_pagamento: "paid",
          infinitepay_transaction_nsu: transactionNsu,
          codigo_ingresso: ticketCode,
          pago_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("infinitepay_order_nsu", orderNsu)
        .eq("status_pagamento", "pending");
      if (error) throw error;
    }

    if (event === "canceled" || event === "refunded") {
      await supabase
        .from("pedidos")
        .update({ status_pagamento: event, atualizado_em: new Date().toISOString() })
        .eq("infinitepay_order_nsu", orderNsu)
        .eq("status_pagamento", "pending");
    }

    return response(200);
  } catch (error) {
    console.error(error);
    return response(500);
  }
});
