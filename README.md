# Festa Anos 80 — pagamento e ingressos

Este projeto usa **Supabase + InfinitePay**. O site coleta o cadastro, a
InfinitePay processa o Pix ou cartão e o Supabase só libera o QR Code depois
que recebe o evento de pagamento aprovado.

## O que está pronto

- `supabase/migrations/`: tabelas de pedidos e check-ins.
- `create-checkout`: cria pedido e checkout na InfinitePay.
- `infinitepay-webhook`: recebe confirmação de pagamento e gera o ingresso.
- `get-ticket`: entrega o bilhete somente para pedido pago.
- `validate-ticket`: registra o primeiro uso do ingresso na portaria.
- `checkin.html`: página de validação na entrada.

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. No **SQL Editor**, execute o conteúdo de
   `supabase/migrations/20261110_create_event_tables.sql`.
3. Instale a Supabase CLI, autentique-se e vincule o projeto:

       supabase login
       supabase link --project-ref SEU_PROJECT_REF

4. Cadastre os segredos. Escolha valores longos e aleatórios para os dois
   segredos; não os publique nem os envie pelo WhatsApp:

       supabase secrets set INFINITEPAY_API_KEY="inchk_..."
       supabase secrets set INFINITEPAY_WEBHOOK_SECRET="um-segredo-aleatorio-longo"
       supabase secrets set CHECKIN_SECRET="senha-da-portaria"
       supabase secrets set SITE_URL="https://seu-dominio.com"

5. Faça o deploy das funções:

       supabase functions deploy create-checkout
       supabase functions deploy infinitepay-webhook
       supabase functions deploy get-ticket
       supabase functions deploy validate-ticket

6. No arquivo `config.js`, troque o valor por:

       window.FESTA_API_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1";

7. Publique os arquivos do site no mesmo endereço definido em `SITE_URL`.
   A InfinitePay usa esse endereço para trazer a pessoa de volta após o
   pagamento.

## InfinitePay

No app da InfinitePay, habilite **Vendas → Checkout → Checkout Integrado** e
crie uma API Key. O backend configura um checkout de uso único e recebe os
eventos `paid`, `canceled` e `refunded`.

## Teste obrigatório

Antes de divulgar:

1. Faça uma compra de teste.
2. Confirme que o pedido passa de `pending` para `paid` na tabela `pedidos`.
3. Confira se o QR Code aparece após voltar ao site.
4. Abra `checkin.html`, informe a senha de portaria e valide o QR Code.
5. Tente validar o mesmo código novamente; deve aparecer que ele já foi usado.

## Dados pessoais

O projeto guarda nome, CT e WhatsApp apenas para operar os ingressos. Publique
uma política de privacidade curta e não compartilhe a tabela de participantes
fora da organização.
