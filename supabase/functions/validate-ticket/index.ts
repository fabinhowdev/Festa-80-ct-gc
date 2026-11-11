import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (req.headers.get("x-checkin-secret") !== Deno.env.get("CHECKIN_SECRET")) {
    return json({ error: "Acesso à portaria não autorizado." }, 401);
  }

  const { codigo } = await req.json();
  if (typeof codigo !== "string" || !codigo.trim()) return json({ error: "Código inválido." }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.rpc("registrar_checkin", {
    p_codigo_ingresso: codigo.trim(),
  });
  if (error) return json({ error: "Não foi possível validar o ingresso." }, 500);

  return json(data?.[0] ?? { liberado: false, mensagem: "Ingresso inválido." });
});
