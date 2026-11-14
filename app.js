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
    adulto: { nome: "Adulto", preco: 50 },
    juvenil: { nome: "Juvenil (14 a 17 anos)", preco: 45 },
    infantil: { nome: "Infantil", preco: 35 },
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

function desenharTextoCentralizado(contexto, texto, y, tamanho, cor) {
  contexto.fillStyle = cor;
  contexto.font = `700 ${tamanho}px Arial, sans-serif`;
  contexto.textAlign = "center";
  contexto.fillText(texto, 540, y);
}

function arredondarRetangulo(contexto, x, y, largura, altura, raio) {
  contexto.beginPath();
  contexto.moveTo(x + raio, y);
  contexto.arcTo(x + largura, y, x + largura, y + altura, raio);
  contexto.arcTo(x + largura, y + altura, x, y + altura, raio);
  contexto.arcTo(x, y + altura, x, y, raio);
  contexto.arcTo(x, y, x + largura, y, raio);
  contexto.closePath();
}

async function criarImagemBilhete() {
  const origemQr = getElement("qrcode").querySelector("canvas, img");
  if (!origemQr) throw new Error("QR Code não encontrado.");
  if (origemQr.tagName === "IMG" && !origemQr.complete) {
    await new Promise((resolve, reject) => {
      origemQr.addEventListener("load", resolve, { once: true });
      origemQr.addEventListener("error", reject, { once: true });
    });
  }

  const imagem = document.createElement("canvas");
  imagem.width = 1080;
  imagem.height = 1520;
  const contexto = imagem.getContext("2d");
  const fundo = contexto.createLinearGradient(0, 0, 1080, 1520);
  fundo.addColorStop(0, "#210b4b");
  fundo.addColorStop(1, "#09051a");
  contexto.fillStyle = fundo;
  contexto.fillRect(0, 0, imagem.width, imagem.height);

  contexto.strokeStyle = "#42e8ff";
  contexto.lineWidth = 7;
  arredondarRetangulo(contexto, 45, 45, 990, 1430, 42);
  contexto.stroke();

  desenharTextoCentralizado(contexto, "CT RAIZ GC APRESENTA", 155, 34, "#42e8ff");
  desenharTextoCentralizado(contexto, "FESTA ANOS 80", 255, 76, "#ffe56b");
  desenharTextoCentralizado(contexto, getElement("t-info").textContent, 325, 33, "#ffffff");
  desenharTextoCentralizado(contexto, getElement("t-tipo").textContent, 380, 34, "#ff9be9");

  contexto.fillStyle = "#ffffff";
  arredondarRetangulo(contexto, 240, 440, 600, 600, 24);
  contexto.fill();
  contexto.drawImage(origemQr, 280, 480, 520, 520);

  desenharTextoCentralizado(contexto, getElement("t-nome").textContent, 1140, 43, "#ffffff");
  desenharTextoCentralizado(contexto, getElement("t-ct").textContent, 1202, 33, "#c7b9e9");
  desenharTextoCentralizado(contexto, getElement("t-cod").textContent, 1270, 28, "#42e8ff");
  desenharTextoCentralizado(contexto, "Apresente este QR Code na entrada", 1382, 29, "#ffffff");
  desenharTextoCentralizado(contexto, "INGRESSO ÚNICO • NÃO COMPARTILHE", 1435, 25, "#ff9be9");

  return new Promise((resolve) => imagem.toBlob(resolve, "image/png"));
}

async function baixarBilhete() {
  const botao = getElement("baixar-bilhete");
  const status = getElement("save-status");
  botao.disabled = true;
  botao.textContent = "Preparando imagem...";
  try {
    const blob = await criarImagemBilhete();
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
