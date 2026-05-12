

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

  let dinheiro = 0;
  let pix = 0;
  let debito = 0;
  let credito = 0;

  entradas.forEach(item => {
  const valor = item.valor || 0;
  const pagamento = item.pagamento || "Dinheiro";

  if (pagamento === "Dinheiro") dinheiro += valor;
  if (pagamento === "Pix") pix += valor;
  if (pagamento === "Débito") debito += valor;
  if (pagamento === "Crédito") credito += valor;
});

atualizarGraficoPagamentos(dinheiro, pix, debito, credito);

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
  window.location.href = "dashboard.html";
}
function logout(){
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html";
  }).catch((error) => {
    alert("Erro ao sair: " + error.message);
  });
}

function atualizarGraficoPagamentos(dinheiro, pix, debito, credito) {
  const total = dinheiro + pix + debito + credito || 1;

  document.getElementById("valorDinheiro").textContent = formatarValor(dinheiro);
  document.getElementById("valorPix").textContent = formatarValor(pix);
  document.getElementById("valorDebito").textContent = formatarValor(debito);
  document.getElementById("valorCredito").textContent = formatarValor(credito);

  document.getElementById("barDinheiro").style.width = `${(dinheiro / total) * 100}%`;
  document.getElementById("barPix").style.width = `${(pix / total) * 100}%`;
  document.getElementById("barDebito").style.width = `${(debito / total) * 100}%`;
  document.getElementById("barCredito").style.width = `${(credito / total) * 100}%`;
}

