import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { isWhatsAppValido, normalizarWhatsApp } from "../_shared/phone.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const { nome, whatsapp, codigo } = await req.json();
  const codigoIngresso = String(codigo ?? "").trim().toUpperCase();
  const telefone = normalizarWhatsApp(whatsapp);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const campos = "nome,ct,tipo_ingresso,codigo_ingresso,status_pagamento";
  let data;
  let error;

  if (codigoIngresso) {
    if (!/^CT80-[A-Z0-9]{10}$/.test(codigoIngresso)) {
      return json({ error: "Informe um ID de bilhete válido." }, 422);
    }
    ({ data, error } = await supabase
      .from("pedidos")
      .select(campos)
      .eq("codigo_ingresso", codigoIngresso)
      .eq("status_pagamento", "paid")
      .limit(1));
  } else {
    if (typeof nome !== "string" || nome.trim().length < 3 || !isWhatsAppValido(telefone)) {
      return json({ error: "Informe nome e WhatsApp válidos." }, 422);
    }
    ({ data, error } = await supabase
      .from("pedidos")
      .select(campos)
      .ilike("nome", nome.trim())
      .eq("whatsapp", telefone)
      .eq("status_pagamento", "paid")
      .limit(5));
  }
  if (error) return json({ error: "Não foi possível procurar o bilhete." }, 500);
  return json({ tickets: data ?? [] });
});
