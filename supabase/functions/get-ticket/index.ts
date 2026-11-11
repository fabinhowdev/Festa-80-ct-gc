import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const pedidoId = new URL(req.url).searchParams.get("pedido");
  if (!pedidoId) return json({ error: "Pedido não informado." }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("pedidos")
    .select("nome, ct, tipo_ingresso, codigo_ingresso, status_pagamento")
    .eq("id", pedidoId)
    .single();

  if (error || !data) return json({ error: "Pedido não encontrado." }, 404);
  if (data.status_pagamento !== "paid") return json({ status: data.status_pagamento });

  return json({
    status: "paid",
    ticket: {
      nome: data.nome,
      ct: data.ct,
      tipo: data.tipo_ingresso === "crianca" ? "Criança" : "Adulto",
      cod: data.codigo_ingresso,
    },
  });
});
