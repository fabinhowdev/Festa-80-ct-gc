import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { isWhatsAppValido, normalizarWhatsApp } from "../_shared/phone.ts";

const TICKET_TYPES = {
  adulto: { label: "Ingresso adulto — Festa Anos 80 do CT", priceCents: 100 },
  crianca: { label: "Ingresso criança — Festa Anos 80 do CT", priceCents: 100 },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const { nome, ct, tipoIngresso, whatsapp } = await req.json();
    const phoneDigits = normalizarWhatsApp(whatsapp);
    const ingresso = TICKET_TYPES[tipoIngresso as keyof typeof TICKET_TYPES];

    if (typeof nome !== "string" || nome.trim().length < 3 ||
        typeof ct !== "string" || ct.trim().length < 2 || !ingresso || !isWhatsAppValido(phoneDigits)) {
      return json({ error: "Preencha nome, CT e um WhatsApp válido." }, 422);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const orderNsu = crypto.randomUUID();

    const { data: pedido, error: insertError } = await supabase
      .from("pedidos")
      .insert({
        nome: nome.trim(),
        ct: ct.trim(),
        whatsapp: phoneDigits,
        tipo_ingresso: tipoIngresso,
        valor_centavos: ingresso.priceCents,
        infinitepay_order_nsu: orderNsu,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "");
    const webhookSecret = Deno.env.get("INFINITEPAY_WEBHOOK_SECRET");
    const apiKey = Deno.env.get("INFINITEPAY_API_KEY");
    if (!siteUrl || !webhookSecret || !apiKey) throw new Error("Segredos do pagamento não configurados.");
    const checkoutExpiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        order_nsu: orderNsu,
        redirect_url: `${siteUrl}/?pedido=${pedido.id}`,
        items: [{ quantity: 1, price: ingresso.priceCents, description: ingresso.label }],
        // O cadastro do evento já guarda o WhatsApp. Não enviamos o telefone
        // para pré-preencher a InfinitePay, pois ela rejeita formatos que
        // variam conforme DDD e impede a criação do checkout.
        customer: { name: nome.trim() },
        options: {
          single_payment: true,
          payment_methods_enabled: ["pix", "credit_card"],
          valid_until: checkoutExpiraEm,
        },
        webhook: {
          url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook?secret=${encodeURIComponent(webhookSecret)}`,
          // Esta URL recebe apenas confirmações de pagamento aprovado.
          // Isso mantém compatibilidade com o payload da InfinitePay,
          // que pode não incluir o nome do evento no corpo da notificação.
          events: ["paid"],
        },
      }),
    });

    const checkout = await response.json();
    const checkoutUrl = checkout.url ?? checkout.checkout_url ?? checkout.link_url;
    if (!response.ok || !checkoutUrl) {
      await supabase.from("pedidos").delete().eq("id", pedido.id);
      console.error("InfinitePay:", checkout);
      return json({ error: "Não foi possível criar o checkout. Tente novamente." }, 502);
    }

    await supabase.from("pedidos").update({ checkout_url: checkoutUrl }).eq("id", pedido.id);
    return json({ checkoutUrl });
  } catch (error) {
    console.error(error);
    return json({ error: "Erro ao iniciar o pagamento." }, 500);
  }
});
