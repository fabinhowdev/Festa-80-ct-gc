/* Utilitários compartilhados para campos de WhatsApp do site. */
(() => {
  const DDD_VALIDOS = new Set([11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99]);

  function somenteNumeros(valor) { return String(valor ?? "").replace(/\D/g, "").slice(0, 11); }
  function formatarWhatsApp(valor) {
    const numeros = somenteNumeros(valor);
    if (!numeros) return "";
    if (numeros.length <= 2) return `(${numeros}`;
    const ddd = numeros.slice(0, 2);
    const telefone = numeros.slice(2);
    if (numeros.length === 10) return `(${ddd}) ${telefone.slice(0, 4)}-${telefone.slice(4)}`;
    if (telefone.length <= 5) return `(${ddd}) ${telefone}`;
    return `(${ddd}) ${telefone.slice(0, 5)}-${telefone.slice(5)}`;
  }
  function isWhatsAppValido(valor) {
    const numeros = somenteNumeros(valor);
    return numeros.length === 11 && DDD_VALIDOS.has(Number(numeros.slice(0, 2))) && numeros[2] === "9";
  }
  function posicaoAposNumeros(texto, quantidade) {
    if (!quantidade) return 0;
    let encontrados = 0;
    for (let i = 0; i < texto.length; i += 1) {
      if (/\d/.test(texto[i])) encontrados += 1;
      if (encontrados === quantidade) return i + 1;
    }
    return texto.length;
  }
  function aplicarMascaraWhatsApp(input, somenteTelefone = true) {
    if (somenteTelefone) {
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("maxlength", "15");
    }
    input.addEventListener("input", () => {
      if (!somenteTelefone && /[^\d\s().-]/.test(input.value)) return;
      const cursor = input.selectionStart ?? input.value.length;
      const numerosAntesDoCursor = (input.value.slice(0, cursor).match(/\d/g) ?? []).length;
      input.value = formatarWhatsApp(input.value);
      const posicao = posicaoAposNumeros(input.value, numerosAntesDoCursor);
      input.setSelectionRange(posicao, posicao);
    });
    input.value = formatarWhatsApp(input.value);
  }
  window.WhatsApp = { somenteNumeros, formatarWhatsApp, isWhatsAppValido, aplicarMascaraWhatsApp };
})();
