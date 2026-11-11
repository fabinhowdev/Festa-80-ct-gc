import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-admin-secret") !== Deno.env.get("ADMIN_SECRET")) {
    return json({ error: "Acesso não autorizado." }, 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase
    .from("pedidos")
    .select("id,nome,ct,whatsapp,tipo_ingresso,valor_centavos,status_pagamento,codigo_ingresso,criado_em,pago_em,usado_em")
    .order("criado_em", { ascending: false })
    .limit(1000);
  if (error) return json({ error: "Não foi possível carregar os pedidos." }, 500);
  return json({ pedidos: data });
});
