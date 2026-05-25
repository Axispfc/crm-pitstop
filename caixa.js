const listaDespesas = document.getElementById("listaDespesas");

let entradas = [];
let despesas = [];

/* FORMATAR VALOR */
function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* CARREGAR DADOS DO FIREBASE */
async function carregarCaixa() {
  const hoje = new Date().toISOString().split("T")[0];

  const snapshot = await db.collection("atendimentos")
    .where("status", "==", "Finalizado")
    .where("statusCaixa", "==", "aberto")
    .where("data", "==", hoje)
    .get();

  entradas = [];

  snapshot.forEach(doc => {
    const dados = doc.data();
    entradas.push({
      id: doc.id,
      ...dados
    });
  });
  
  atualizarTela();
  renderizarDespesas();
}

/* ATUALIZAR TELA PRINCIPAL E FILTRO */
function atualizarTela() {
  const movimentacoes = document.getElementById("movimentacoes");
  movimentacoes.innerHTML = "";

  // Lê o valor do filtro no HTML (se existir)
  const selectFiltro = document.getElementById("filtroTipo");
  const filtro = selectFiltro ? selectFiltro.value : "Ambos";

  let total = 0;
  let lavagens = 0;
  let estacionamentos = 0;
  let dinheiro = 0, pix = 0, debito = 0, credito = 0;

  entradas.forEach(item => {
    // 1. Soma para os cards superiores (Independente do filtro)
    const valor = item.valor || 0;
    total += valor;

    if (item.tipoEntrada === "Lavagem") lavagens++;
    if (item.tipoEntrada === "Estacionamento") estacionamentos++;

    const pagamento = item.pagamento || "Dinheiro";
    if (pagamento === "Dinheiro") dinheiro += valor;
    if (pagamento === "Pix") pix += valor;
    if (pagamento === "Débito") debito += valor;
    if (pagamento === "Crédito") credito += valor;

    // 2. Lógica do filtro para exibir ou não na lista
    const mostrarItem = filtro === "Ambos" || item.tipoEntrada === filtro;

    if (mostrarItem) {
      const div = document.createElement("div");
      div.classList.add("table-row");
      div.innerHTML = `
        <span>${item.hora || "-"}</span>
        <span>${item.nome || "-"}</span>
        <span>${item.placa || "-"}</span>
        <span>${item.tipoEntrada || "-"}</span>
        <span>${item.servico || "-"}</span>
        <span>${formatarValor(item.valor || 0)}</span>
      `;
      movimentacoes.appendChild(div);
    }
  }); 

  // Atualiza os Cards
  const ticket = entradas.length > 0 ? total / entradas.length : 0;
  document.getElementById("faturamento").textContent = formatarValor(total);
  document.getElementById("lavagens").textContent = lavagens;
  document.getElementById("estacionamentos").textContent = estacionamentos;
  document.getElementById("ticket").textContent = formatarValor(ticket);

  atualizarGraficoPagamentos(dinheiro, pix, debito, credito);
  atualizarResumo();
}

/* DESPESAS */
async function adicionarDespesa() {
  const desc = document.getElementById("descDespesa").value;
  const valor = parseFloat(document.getElementById("valorDespesa").value);

  if (!desc || isNaN(valor) || valor <= 0) {
    return alert("Preencha uma descrição e um valor válido.");
  }

  const hoje = new Date().toISOString().split("T")[0];
  const novaDespesa = {
    desc,
    valor,
    data: hoje,
    statusCaixa: "aberto"
  };

  try {
    // 1. Salva no Firebase primeiro
    const docRef = await db.collection("despesas").add(novaDespesa);
    
    // 2. Adiciona na lista local com o ID gerado pelo Firebase
    despesas.push({ id: docRef.id, ...novaDespesa });

    // 3. Limpa os inputs e atualiza a tela
    document.getElementById("descDespesa").value = "";
    document.getElementById("valorDespesa").value = "";
    
    renderizarDespesas();
    atualizarResumo();
  } catch (error) {
    alert("Erro ao salvar despesa: " + error.message);
  }
}

async function removerDespesa(index) {
  const item = despesas[index];

  try {
    // Apaga do Firebase usando o ID
    if (item.id) {
      await db.collection("despesas").doc(item.id).delete();
    }
    
    // Remove da tela
    despesas.splice(index, 1);
    renderizarDespesas();
    atualizarResumo();
  } catch (error) {
    alert("Erro ao excluir despesa: " + error.message);
  }
}
async function carregarDespesasAbertas() {
  const hoje = new Date().toISOString().split("T")[0];

  const snapshot = await db.collection("despesas")
    .where("statusCaixa", "==", "aberto")
    .where("data", "==", hoje)
    .get();

  despesas = [];

  snapshot.forEach(doc => {
    despesas.push({
      id: doc.id,
      ...doc.data()
    });
  });

  renderizarDespesas();
  atualizarResumo();
}

function renderizarDespesas() {
  if (!listaDespesas) return;
  listaDespesas.innerHTML = ""; 

  if (despesas.length === 0) {
    listaDespesas.innerHTML = '<p class="empty">Nenhuma despesa lançada.</p>';
    return;
  }

  despesas.forEach((item, index) => {
    const div = document.createElement("div");
    // Usando CSS embutido temporário para garantir que fique bonito, caso seu CSS não tenha a classe "despesa-item"
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.padding = "10px 15px";
    div.style.borderBottom = "1px solid #eee";
    div.style.alignItems = "center";
    
    div.innerHTML = `
      <span>${item.desc}</span>
      <span style="color: #e74c3c; font-weight: bold;">- ${formatarValor(item.valor)}</span>
      <button onclick="removerDespesa(${index})" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="Excluir">❌</button>
    `;
    
    listaDespesas.appendChild(div);
  });
}

/* RESUMO FINAL */
function atualizarResumo() {
  const totalEntradas = entradas.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalSaidas = despesas.reduce((acc, item) => acc + item.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  document.getElementById("totalEntradas").textContent = formatarValor(totalEntradas);
  document.getElementById("totalSaidas").textContent = formatarValor(totalSaidas);
  document.getElementById("saldo").textContent = formatarValor(saldo);
}

/* FECHAR CAIXA */
async function fecharCaixa() {
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
    movimentacoes: movimentacoesFechadas
  };

  try {
    await db.collection("historicoCaixa").add(fechamento);
   const batch = db.batch();

    // Fecha as entradas (lavagem/estacionamento)
    entradas.forEach(item => {
      const ref = db.collection("atendimentos").doc(item.id);
      batch.update(ref, { statusCaixa: "fechado" });
    });

    // 👇 ADICIONE ISSO: Fecha as despesas
    despesas.forEach(item => {
      if (item.id) {
        const ref = db.collection("despesas").doc(item.id);
        batch.update(ref, { statusCaixa: "fechado" });
      }
    });

    await batch.commit();

    // Limpar tela e gerar PDF
    entradas = [];
    despesas = [];
    limparTela();
    alert("Caixa fechado e salvo com sucesso!");
    
    const pdf = gerarPDF(fechamento);
    window.open(pdf.output("bloburl"), "_blank");

  } catch (error) {
    alert("Erro ao fechar caixa: " + error.message);
  }
}

/* GERAR PDF */
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

  fechamento.movimentacoes.forEach((m) => {
    doc.text(`${m.nome} - ${m.placa} - ${formatarValor(m.valor || 0)}`, 10, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });

  return doc;
}

/* BARRAS DE PAGAMENTO */
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

/* LIMPAR TELA PÓS FECHAMENTO */
function limparTela() {
  document.getElementById("movimentacoes").innerHTML = "";
  document.getElementById("faturamento").textContent = formatarValor(0);
  document.getElementById("lavagens").textContent = 0;
  document.getElementById("estacionamentos").textContent = 0;
  document.getElementById("ticket").textContent = formatarValor(0);
  document.getElementById("totalEntradas").textContent = formatarValor(0);
  document.getElementById("totalSaidas").textContent = formatarValor(0);
  document.getElementById("saldo").textContent = formatarValor(0);
  renderizarDespesas(); // Limpa as despesas visualmente
}

/* LOGOUT */
function logout(){
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html";
  }).catch((error) => alert("Erro ao sair: " + error.message));
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  carregarCaixa();
  carregarDespesasAbertas();
});