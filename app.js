const API_URL = window.FESTA_API_URL?.replace(/\/$/, "");
const getElement = (id) => document.getElementById(id);
let dados = {};
let pedidoAtual = null;

WhatsApp.aplicarMascaraWhatsApp(getElement("zap"));

const CFG = {
  data: "Sábado, 19/12/2026",
  hora: "19h",
  local: "CT Raiz GC",
  ingressos: {
    adulto: { nome: "Adulto", preco: 1 },
    crianca: { nome: "Criança", preco: 1 },
  },
};

getElement("i-data").textContent = CFG.data;
getElement("i-hora").textContent = CFG.hora;
getElement("i-local").textContent = CFG.local;

function atualizarValor() {
  const ingresso = CFG.ingressos[getElement("tipo-ingresso").value];
  const valor = `R$ ${ingresso.preco.toFixed(2).replace(".", ",")}`;
  getElement("i-preco").textContent = `A partir de ${valor}`;
  getElement("p-valor").textContent = valor;
}

atualizarValor();
getElement("tipo-ingresso").addEventListener("change", atualizarValor);

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
  getElement("t-cod").textContent = `ID do bilhete: ${bilhete.cod}`;
  getElement("t-info").textContent = `${CFG.data} · ${CFG.hora}`;
  getElement("t-tipo").textContent = `Ingresso ${bilhete.tipo}`;

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

async function baixarBilhete() {
  const botao = getElement("baixar-bilhete");
  const status = getElement("save-status");
  const bilhete = getElement("ticket-capture");
  if (typeof html2canvas !== "function") {
    status.textContent = "Não foi possível preparar a imagem. Tire um print deste bilhete.";
    return;
  }

  botao.disabled = true;
  botao.textContent = "Preparando imagem...";
  try {
    const imagem = await html2canvas(bilhete, { backgroundColor: "#13072f", scale: 2, useCORS: true });
    const blob = await new Promise((resolve) => imagem.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Não foi possível criar a imagem.");

    const nomeArquivo = `ingresso-festa-anos-80-${getElement("t-cod").textContent.replace(/[^A-Z0-9]/gi, "-")}.png`;
    const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: "Meu ingresso — Festa Anos 80" });
        status.textContent = "Escolha Salvar imagem ou Galeria para guardar seu ingresso.";
        return;
      } catch (erro) {
        if (erro.name === "AbortError") {
          status.textContent = "Salvamento cancelado. Você pode tentar novamente.";
          return;
        }
      }
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    status.textContent = "Imagem baixada. Confira a pasta Downloads ou a galeria do seu celular.";
  } catch (erro) {
    status.textContent = "Não foi possível baixar a imagem. Tire um print deste bilhete.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar ingresso como imagem";
  }
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
  const tipoIngresso = getElement("tipo-ingresso").value;
  const zap = WhatsApp.somenteNumeros(getElement("zap").value);

  if (!nome) {
    getElement("erro").textContent = "Informe o nome completo.";
    return;
  }
  if (!ct) {
    getElement("erro").textContent = "Escolha seu CT.";
    return;
  }
  if (!WhatsApp.isWhatsAppValido(zap)) {
    getElement("erro").textContent = "Informe um WhatsApp válido, com DDD.";
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
      body: JSON.stringify({ nome, ct, tipoIngresso, whatsapp: zap }),
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
getElement("baixar-bilhete").addEventListener("click", baixarBilhete);

const pedidoDaUrl = new URLSearchParams(window.location.search).get("pedido");
if (pedidoDaUrl) {
  pedidoAtual = pedidoDaUrl;
  mudarEtapa(2);
  consultarPedido();
}
