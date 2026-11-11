# Festa Anos 80 do CT

Landing page de venda de ingressos para a Festa Anos 80 do CT. O projeto recebe
o cadastro, cria um checkout na InfinitePay e gera um bilhete com QR Code após
a confirmação do pagamento.

**Site:** https://festa-raizgc.netlify.app/

## Como funciona

~~~
Cadastro → Checkout InfinitePay → Pagamento aprovado → Webhook → Bilhete com QR Code → Check-in
~~~

1. A pessoa informa nome, CT e WhatsApp no site.
2. O backend registra o pedido e cria um link de checkout na InfinitePay.
3. A pessoa paga por Pix ou cartão na página segura da InfinitePay.
4. O webhook confirma o pagamento e gera um código único de ingresso.
5. Ao retornar ao site, a pessoa vê o bilhete com QR Code.
6. Na entrada, a equipe valida o código em checkin.html. O primeiro uso é
   liberado; os seguintes são bloqueados.

## Tecnologias

- HTML, CSS e JavaScript puro
- [Supabase](https://supabase.com/) para banco de dados e Edge Functions
- [InfinitePay Checkout Integrado](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay)
- QRCode.js para gerar o QR Code
- Netlify para hospedagem

## Estrutura

~~~
.
├── index.html                    Página de cadastro e bilhete
├── checkin.html                  Tela de validação na portaria
├── styles.css                    Estilos da aplicação
├── app.js                        Fluxo de cadastro e consulta do ingresso
├── config.js                     URL pública das Functions do Supabase
└── supabase/
    ├── migrations/               Tabelas de pedidos e check-ins
    └── functions/
        ├── create-checkout/      Cria pedido e checkout InfinitePay
        ├── infinitepay-webhook/  Confirma pagamento e gera código
        ├── get-ticket/           Entrega bilhete de pedido pago
        └── validate-ticket/      Registra check-in na entrada
~~~

## Configuração

### Banco de dados

Crie um projeto no Supabase e, no SQL Editor, execute o conteúdo de:

~~~
supabase/migrations/20261110_create_event_tables.sql
~~~

### Supabase CLI

Com Node.js 20+ instalado:

~~~powershell
npm install supabase --save-dev
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
~~~

### Segredos

Cadastre os segredos apenas no Supabase. Nunca coloque API Keys, senhas ou
variáveis de ambiente no HTML, JavaScript público ou repositório:

~~~powershell
npx supabase secrets set SITE_URL="https://seu-dominio.com"
npx supabase secrets set INFINITEPAY_API_KEY="inchk_sua_chave"
npx supabase secrets set INFINITEPAY_WEBHOOK_SECRET="segredo-longo-e-aleatorio"
npx supabase secrets set CHECKIN_SECRET="senha-forte-da-portaria"
~~~

### Publicar as Functions

~~~powershell
npx supabase functions deploy create-checkout
npx supabase functions deploy infinitepay-webhook
npx supabase functions deploy get-ticket
npx supabase functions deploy validate-ticket
~~~

### Frontend

Em config.js, informe a URL pública das Functions:

~~~js
window.FESTA_API_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1";
~~~

Publique os arquivos estáticos no mesmo domínio configurado em SITE_URL.

## InfinitePay

1. Acesse **Vendas → Checkout** no app ou painel da InfinitePay.
2. Habilite o **Checkout Integrado**.
3. Crie uma API Key.
4. Salve-a no segredo INFINITEPAY_API_KEY do Supabase.

O backend cria um checkout de uso único. A chave da InfinitePay permanece
exclusivamente no Supabase.

## Operação da portaria

Abra:

~~~
https://seu-dominio.com/checkin.html
~~~

Informe a senha definida em CHECKIN_SECRET e digite ou leia o código do QR
Code. Um ingresso aprovado só pode ser usado uma vez.

## Teste antes de divulgar

1. Faça uma compra real de teste.
2. Confirme no Supabase que o pedido ficou com status paid.
3. Verifique o bilhete e o QR Code na página de retorno.
4. Valide o código em checkin.html.
5. Tente validar o mesmo código novamente; ele deve ser recusado.

## Segurança e privacidade

- O QR Code contém apenas o identificador do ingresso.
- Nome, CT e WhatsApp são usados somente para operar os ingressos.
- Restrinja a senha da portaria à equipe do evento.

## Licença

Projeto de uso interno da organização da Festa Anos 80 do CT.
