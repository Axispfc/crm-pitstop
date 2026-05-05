let entradas = [];
let despesas = [];

/* FORMATAR */
function formatarValor(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* CARREGAR DADOS */
async function carregarCaixa() {

  const snapshot = await db.collection("atendimentos")
    .where("status", "==", "Finalizado")
    .get();

  entradas = [];

  snapshot.forEach(doc => {
    const dados = doc.data();
    entradas.push(dados);
  });

  atualizarTela();
}

/* ATUALIZAR TELA */
function atualizarTela() {

  const movimentacoes = document.getElementById("movimentacoes");

  movimentacoes.innerHTML = "";

  let total = 0;
  let lavagens = 0;
  let estacionamentos = 0;

  entradas.forEach(item => {

    total += item.valor || 0;

    if (item.tipoEntrada === "Lavagem") lavagens++;
    if (item.tipoEntrada === "Estacionamento") estacionamentos++;

    movimentacoes.innerHTML += `
      <p>${item.nome} - ${item.placa} - ${formatarValor(item.valor || 0)}</p>
    `;
  });

  const ticket = entradas.length > 0 ? total / entradas.length : 0;

  document.getElementById("faturamento").textContent = formatarValor(total);
  document.getElementById("lavagens").textContent = lavagens;
  document.getElementById("estacionamentos").textContent = estacionamentos;
  document.getElementById("ticket").textContent = formatarValor(ticket);

  atualizarResumo();
}

/* DESPESAS */
function adicionarDespesa() {
  const desc = document.getElementById("descDespesa").value;
  const valor = parseFloat(document.getElementById("valorDespesa").value);

  despesas.push({ desc, valor });

  atualizarResumo();
}

/* RESUMO */
function atualizarResumo() {

  const totalEntradas = entradas.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalSaidas = despesas.reduce((acc, item) => acc + item.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  document.getElementById("totalEntradas").textContent = formatarValor(totalEntradas);
  document.getElementById("totalSaidas").textContent = formatarValor(totalSaidas);
  document.getElementById("saldo").textContent = formatarValor(saldo);
}

/* FECHAR CAIXA */
function fecharCaixa() {
  alert("Caixa fechado com sucesso!");
}

/* INIT */
carregarCaixa();

/*Navegação */
function irParaUsuarios() {
  window.location.href = "usuario.html";
}
function irParaDashboard() {
  window.location.href = "index.html";
}