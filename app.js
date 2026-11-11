const API_URL = window.FESTA_API_URL?.replace(/\/$/, "");
const getElement = (id) => document.getElementById(id);
let dados = {};
let pedidoAtual = null;

const CFG = {
  data: "Sabádo, 19/12/2026",
  hora: "19hrs",
  local: "CT raíz Gc",
  preco: 30,
};

const valor = `R$ ${CFG.preco.toFixed(2).replace(".", ",")}`;
getElement("i-data").textContent = CFG.data;
getElement("i-hora").textContent = CFG.hora;
getElement("i-local").textContent = CFG.local;
getElement("i-preco").textContent = valor;
getElement("p-valor").textContent = valor;

function mudarEtapa(etapaAtual) {
  for (let etapa = 1; etapa <= 3; etapa += 1) {
    getElement(`step${etapa}`).classList.toggle("hidden", etapa !== etapaAtual);
    getElement(`s${etapa}`).classList.toggle("on", etapa <= etapaAtual);
  }
}

function mostrarMensagemPagamento(mensagem) {
  getElement("payment-status").textContent = mensagem;
}

function mostrarBilhete(bilhete) {
  getElement("t-nome").textContent = bilhete.nome;
  getElement("t-ct").textContent = bilhete.ct;
  getElement("t-cod").textContent = bilhete.cod;
  getElement("t-info").textContent = `${CFG.data} · ${CFG.hora}`;

  const qrCode = getElement("qrcode");
  qrCode.innerHTML = "";
  const conteudoQr = `FESTA80CT|${bilhete.cod}`;

  try {
    new QRCode(qrCode, { text: conteudoQr, width: 200, height: 200 });
  } catch {
    qrCode.textContent = bilhete.cod;
  }

  mudarEtapa(3);
}

async function consultarPedido() {
  if (!pedidoAtual || !API_URL || API_URL.includes("COLE_AQUI")) {
    mostrarMensagemPagamento("Configuração do servidor ainda não concluída.");
    return;
  }

  getElement("b2").disabled = true;
  mostrarMensagemPagamento("Consultando a confirmação do pagamento...");

  try {
    const resposta = await fetch(`${API_URL}/get-ticket?pedido=${encodeURIComponent(pedidoAtual)}`);
    const resultado = await resposta.json();

    if (!resposta.ok) throw new Error(resultado.error);
    if (resultado.status === "paid") {
      mostrarBilhete(resultado.ticket);
      return;
    }

    const mensagens = {
      pending: "Pagamento ainda não confirmado. Aguarde alguns instantes e atualize.",
      canceled: "Este pagamento foi cancelado.",
      refunded: "Este pagamento foi estornado.",
    };
    mostrarMensagemPagamento(mensagens[resultado.status] ?? "Aguardando confirmação do pagamento.");
  } catch (erro) {
    mostrarMensagemPagamento(erro.message || "Não foi possível consultar o pagamento.");
  } finally {
    getElement("b2").disabled = false;
  }
}

getElement("b1").addEventListener("click", async () => {
  const nome = getElement("nome").value.trim();
  const ct = getElement("ct").value.trim();
  const zap = getElement("zap").value.trim();

  if (!nome || !ct || zap.replace(/\D/g, "").length < 10) {
    getElement("erro").textContent = "Preencha nome, CT e um WhatsApp válido.";
    return;
  }
  if (!API_URL || API_URL.includes("COLE_AQUI")) {
    getElement("erro").textContent = "O pagamento online ainda não foi configurado.";
    return;
  }

  getElement("erro").textContent = "";
  getElement("b1").disabled = true;
  getElement("b1").textContent = "Criando pagamento...";

  try {
    const resposta = await fetch(`${API_URL}/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, ct, whatsapp: zap }),
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.error);

    window.location.assign(resultado.checkoutUrl);
  } catch (erro) {
    getElement("erro").textContent = erro.message || "Não foi possível iniciar o pagamento.";
    getElement("b1").disabled = false;
    getElement("b1").textContent = "Continuar para o pagamento";
  }
});

getElement("b2").addEventListener("click", consultarPedido);

const pedidoDaUrl = new URLSearchParams(window.location.search).get("pedido");
if (pedidoDaUrl) {
  pedidoAtual = pedidoDaUrl;
  mudarEtapa(2);
  consultarPedido();
}
