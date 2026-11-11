import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const { nome, whatsapp } = await req.json();
  const telefone = String(whatsapp ?? "").replace(/\D/g, "");
  if (typeof nome !== "string" || nome.trim().length < 3 || telefone.length < 10) {
    return json({ error: "Informe nome e WhatsApp válidos." }, 422);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase
    .from("pedidos")
    .select("nome,ct,tipo_ingresso,codigo_ingresso,status_pagamento")
    .ilike("nome", nome.trim())
    .eq("whatsapp", telefone)
    .eq("status_pagamento", "paid")
    .limit(5);
  if (error) return json({ error: "Não foi possível procurar o bilhete." }, 500);
  return json({ tickets: data ?? [] });
});
