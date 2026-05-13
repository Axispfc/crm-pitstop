const listaHistorico = document.getElementById("listaHistorico");


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

  const hoje = new Date().toISOString().split("T")[0];

const snapshot = await db.collection("atendimentos")
  .where("status", "==", "Finalizado")
  .where("statusCaixa", "==", "aberto")
  .where("data", "==", hoje) // 👈 AGORA FUNCIONA
  .get();

  
  entradas = [];

 snapshot.forEach(doc => {
  const dados = doc.data();

  entradas.push({
    id: doc.id, // 👈 ESSENCIAL
    ...dados
  });
});
  atualizarTela();
}

/* ATUALIZAR TELA */
function atualizarTela() {

  const movimentacoes = document.getElementById("movimentacoes");

   movimentacoes.innerHTML = "";

function adicionarLinha(dados) {
  const div = document.createElement("div");
  div.classList.add("table-row");

 

  div.innerHTML = `
    <span>${dados.hora}</span>
    <span>${dados.nome}</span>
    <span>${dados.placa}</span>
    <span>${dados.tipoEntrada}</span>
    <span>${dados.servico}</span>
    <span>R$ ${dados.valor}</span>
  `;

  movimentacoes.appendChild(div);
}

  let total = 0;
  let lavagens = 0;
  let estacionamentos = 0;

  entradas.forEach(item => {

    total += item.valor || 0;

    if (item.tipoEntrada === "Lavagem") lavagens++;
    if (item.tipoEntrada === "Estacionamento") estacionamentos++;

    adicionarLinha(item);
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

async function fecharCaixa() {
  console.log("Fechando caixa...");

  if (!confirm("Deseja realmente fechar o caixa?")) return;

  if (entradas.length === 0 && despesas.length === 0) {
    alert("Não há dados para fechar o caixa!");
    return;
  }

  const totalEntradas = entradas.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalSaidas = despesas.reduce((acc, item) => acc + item.valor, 0);
  const saldo = totalEntradas - totalSaidas;


  const movimentacoesFechadas = entradas.map(item => ({
  ...item,
  fechado: true
}));

  const fechamento = {
    data: new Date(),
    totalEntradas,
    totalSaidas,
    saldo,
    quantidadeEntradas: entradas.length,
    despesas: despesas,
     movimentacoes: movimentacoesFechadas // 👈 AQUI
  };
  try {

    // 🔹 Salvar histórico
    await db.collection("historicoCaixa").add(fechamento);

    // 🔹 MARCAR COMO FECHADO NO FIRESTORE
    const batch = db.batch();

    entradas.forEach(item => {
      const ref = db.collection("atendimentos").doc(item.id); // 👈 precisa do ID
      batch.update(ref, { statusCaixa: "fechado" });

      
    });
     

    await batch.commit();

    // 🔹 Limpar dados locais
    entradas = [];
    despesas = [];

    limparTela();

    alert("Caixa fechado e salvo com sucesso!");

  }
  
  
   catch (error) {
    alert("Erro ao fechar caixa: " + error.message);
  }
  try {
    // 🔥 GERAR PDF
    const pdf = gerarPDF(fechamento);

    // 🔥 CONVERTER PARA BASE64
    const pdfBase64 = pdf.output("datauristring");
    
    // 🔥 ABRE O PDF EM NOVA ABA
    const pdfUrl = pdf.output("bloburl");
    window.open(pdfUrl, "_blank");
  } catch (error) {
    console.error("Erro ao gerar PDF: ", error);
  }
}
function gerarPDF(fechamento) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  doc.setFontSize(16);
  doc.text("Relatório de Caixa - Pit Stop", 10, y);

  y += 10;

  doc.setFontSize(12);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 10, y);

  y += 10;
  doc.text(`Entradas: ${formatarValor(fechamento.totalEntradas)}`, 10, y);
  y += 8;
  doc.text(`Saídas: ${formatarValor(fechamento.totalSaidas)}`, 10, y);
  y += 8;
  doc.text(`Saldo: ${formatarValor(fechamento.saldo)}`, 10, y);

  y += 12;
  doc.text("Movimentações:", 10, y);

  y += 8;

  fechamento.movimentacoes.forEach((m, i) => {
    doc.text(
      `${m.nome} - ${m.placa} - ${formatarValor(m.valor || 0)}`,
      10,
      y
    );
    y += 6;

    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });

  return doc;
}


function limparTela() {

  document.getElementById("movimentacoes").innerHTML = "";

  document.getElementById("faturamento").textContent = formatarValor(0);
  document.getElementById("lavagens").textContent = 0;
  document.getElementById("estacionamentos").textContent = 0;
  document.getElementById("ticket").textContent = formatarValor(0);

  document.getElementById("totalEntradas").textContent = formatarValor(0);
  document.getElementById("totalSaidas").textContent = formatarValor(0);
  document.getElementById("saldo").textContent = formatarValor(0);
}

/* INIT */
carregarCaixa();


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

