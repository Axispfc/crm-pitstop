const listaDespesas = document.getElementById("listaDespesas");

let entradas = [];
let despesas = [];
let entradasFiltradas = [];
let paginaMovimentacoes = 1;

const movimentacoesPorPagina = 10;
const limiteLavagensSemComissao = 15;
const valorComissaoPorLavagem = 5;

/* =========================================================
   FORMATAR VALOR
========================================================= */
function formatarValor(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* =========================================================
   CONVERTER DATA DO FIREBASE
========================================================= */
function obterDataMovimentacao(item) {
  if (item.finalizadoEm) {
    return item.finalizadoEm.toDate
      ? item.finalizadoEm.toDate()
      : new Date(item.finalizadoEm);
  }

  if (item.saida) {
    return item.saida.toDate
      ? item.saida.toDate()
      : new Date(item.saida);
  }

  if (item.entrada) {
    return item.entrada.toDate
      ? item.entrada.toDate()
      : new Date(item.entrada);
  }

  if (item.criadoEm) {
    return item.criadoEm.toDate
      ? item.criadoEm.toDate()
      : new Date(item.criadoEm);
  }

  if (item.data) {
    const horario = item.hora || "12:00";

    return new Date(`${item.data}T${horario}:00`);
  }

  return new Date(0);
}

/* =========================================================
   IDENTIFICAR LAVAGENS COM COMISSÃO
========================================================= */
function obterLavagensComComissao() {
  const lavagens = entradas
    .filter(item => item.tipoEntrada === "Lavagem")
    .slice()
    .sort((a, b) => {
      return obterDataMovimentacao(a) - obterDataMovimentacao(b);
    });

  return lavagens
    .slice(limiteLavagensSemComissao)
    .map((item, index) => ({
      ...item,
      numeroLavagem:
        limiteLavagensSemComissao + index + 1,
      valorComissao: valorComissaoPorLavagem
    }));
}

/* =========================================================
   CALCULAR TOTAL DA COMISSÃO
========================================================= */
function calcularTotalComissao() {
  const lavagensComComissao =
    obterLavagensComComissao();

  return lavagensComComissao.length *
    valorComissaoPorLavagem;
}

/* =========================================================
   ATUALIZAR CARD DE COMISSÃO
========================================================= */
function atualizarCardComissao() {
  const totalComissao = calcularTotalComissao();
  const lavagensComComissao =
    obterLavagensComComissao().length;

  const elementoValor =
    document.getElementById("totalComissoes");

  const elementoQuantidade =
    document.getElementById("quantidadeComissoes");

  if (elementoValor) {
    elementoValor.textContent =
      formatarValor(totalComissao);
  }

  if (elementoQuantidade) {
    elementoQuantidade.textContent =
      `${lavagensComComissao} lavagens com comissão`;
  }
}

/* =========================================================
   CARREGAR DADOS DO FIREBASE
========================================================= */
async function carregarCaixa() {
  const snapshot = await db
    .collection("atendimentos")
    .where("status", "==", "Finalizado")
    .where("statusCaixa", "==", "aberto")
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

/* =========================================================
   ATUALIZAR TELA PRINCIPAL E FILTRO
========================================================= */
function atualizarTela() {
  const movimentacoes =
    document.getElementById("movimentacoes");

  movimentacoes.innerHTML = "";

  const selectFiltro =
    document.getElementById("filtroTipo");

  const filtro =
    selectFiltro
      ? selectFiltro.value
      : "Ambos";

  let total = 0;
  let lavagens = 0;
  let estacionamentos = 0;

  let dinheiro = 0;
  let pix = 0;
  let debito = 0;
  let credito = 0;

  /*
   * Quando o filtro for Comissões, exibimos somente
   * as lavagens a partir da 16ª.
   */
  if (filtro === "Comissões") {
    entradasFiltradas =
      obterLavagensComComissao();
  } else {
    entradasFiltradas = entradas.filter(item => {
      return (
        filtro === "Ambos" ||
        item.tipoEntrada === filtro
      );
    });
  }

  /*
   * Soma os cards e as formas de pagamento.
   */
  if (filtro !== "Comissões") {
    entradasFiltradas.forEach(item => {
      const valor = Number(item.valor || 0);

      const pagamento =
        item.pagamento || "Dinheiro";

      total += valor;

      if (item.tipoEntrada === "Lavagem") {
        lavagens++;
      }

      if (
        item.tipoEntrada === "Estacionamento"
      ) {
        estacionamentos++;
      }

      if (
        pagamento === "Dinheiro/Crédito"
      ) {
        dinheiro += Number(
          item.valorDinheiro || 0
        );

        credito += Number(
          item.valorCredito || 0
        );

      } else if (
        pagamento === "Dinheiro/Débito"
      ) {
        dinheiro += Number(
          item.valorDinheiro || 0
        );

        debito += Number(
          item.valorDebito || 0
        );

      } else if (
        pagamento === "Dinheiro"
      ) {
        dinheiro += valor;

      } else if (
        pagamento === "Pix"
      ) {
        pix += valor;

      } else if (
        pagamento === "Débito"
      ) {
        debito += valor;

      } else if (
        pagamento === "Crédito"
      ) {
        credito += valor;
      }
    });
  }

  /*
   * Na aba Comissões, o card de faturamento
   * mostrará o total das comissões da lista.
   */
  if (filtro === "Comissões") {
    total = entradasFiltradas.reduce(
      (acumulado, item) =>
        acumulado +
        Number(item.valorComissao || 0),
      0
    );

    lavagens = entradasFiltradas.length;
    estacionamentos = 0;
  }

  /* PAGINAÇÃO */
  const inicio =
    (paginaMovimentacoes - 1) *
    movimentacoesPorPagina;

  const fim =
    inicio + movimentacoesPorPagina;

  const entradasPagina =
    entradasFiltradas.slice(inicio, fim);

  entradasPagina.forEach(item => {
    const div =
      document.createElement("div");

    div.classList.add("table-row");

    if (filtro === "Comissões") {
      div.innerHTML = `
        <span>${item.hora || "-"}</span>

        <span>${item.nome || "-"}</span>

        <span>${item.placa || "-"}</span>

        <span>Comissão</span>

        <span>
          ${item.numeroLavagem}ª lavagem
        </span>

        <span>
          ${formatarValor(item.valorComissao)}
        </span>
      `;
    } else {
      div.innerHTML = `
        <span>${item.hora || "-"}</span>

        <span>${item.nome || "-"}</span>

        <span>${item.placa || "-"}</span>

        <span>${item.tipoEntrada || "-"}</span>

        <span>${item.servico || "-"}</span>

        <span>
          ${formatarValor(item.valor || 0)}
        </span>
      `;
    }

    movimentacoes.appendChild(div);
  });

  /*
   * Mantém o cálculo original do ticket
   * para os filtros normais.
   */
  const ticket =
    filtro === "Comissões"
      ? 0
      : entradas.length > 0
        ? total / entradas.length
        : 0;

  document
    .getElementById("faturamento")
    .textContent = formatarValor(total);

  document
    .getElementById("lavagens")
    .textContent = lavagens;

  document
    .getElementById("estacionamentos")
    .textContent = estacionamentos;

  document
    .getElementById("ticket")
    .textContent = formatarValor(ticket);

  renderizarPaginacaoMovimentacoes();

  atualizarGraficoPagamentos(
    dinheiro,
    pix,
    debito,
    credito
  );

  atualizarCardComissao();
  atualizarResumo();
}

/* =========================================================
   DESPESAS
========================================================= */
async function adicionarDespesa() {
  const desc =
    document.getElementById("descDespesa").value;

  const valor = parseFloat(
    document.getElementById("valorDespesa").value
  );

  if (
    !desc ||
    isNaN(valor) ||
    valor <= 0
  ) {
    return alert(
      "Preencha uma descrição e um valor válido."
    );
  }

  const hoje =
    new Date().toISOString().split("T")[0];

  const novaDespesa = {
    desc,
    valor,
    data: hoje,
    statusCaixa: "aberto"
  };

  try {
    const docRef = await db
      .collection("despesas")
      .add(novaDespesa);

    despesas.push({
      id: docRef.id,
      ...novaDespesa
    });

    document
      .getElementById("descDespesa")
      .value = "";

    document
      .getElementById("valorDespesa")
      .value = "";

    renderizarDespesas();
    atualizarResumo();

  } catch (error) {
    alert(
      "Erro ao salvar despesa: " +
      error.message
    );
  }
}

async function removerDespesa(index) {
  const item = despesas[index];

  try {
    if (item.id) {
      await db
        .collection("despesas")
        .doc(item.id)
        .delete();
    }

    despesas.splice(index, 1);

    renderizarDespesas();
    atualizarResumo();

  } catch (error) {
    alert(
      "Erro ao excluir despesa: " +
      error.message
    );
  }
}

async function carregarDespesasAbertas() {
  const snapshot = await db
    .collection("despesas")
    .where("statusCaixa", "==", "aberto")
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
    listaDespesas.innerHTML =
      '<p class="empty">Nenhuma despesa lançada.</p>';

    return;
  }

  despesas.forEach((item, index) => {
    const div =
      document.createElement("div");

    div.style.display = "flex";
    div.style.justifyContent =
      "space-between";
    div.style.padding = "10px 15px";
    div.style.borderBottom =
      "1px solid #eee";
    div.style.alignItems = "center";

    div.innerHTML = `
      <span>${item.desc}</span>

      <span
        style="
          color: #e74c3c;
          font-weight: bold;
        "
      >
        - ${formatarValor(item.valor)}
      </span>

      <button
        onclick="removerDespesa(${index})"
        style="
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
        "
        title="Excluir"
      >
        ❌
      </button>
    `;

    listaDespesas.appendChild(div);
  });
}

/* =========================================================
   RESUMO FINAL
========================================================= */
function atualizarResumo() {
  const totalEntradas = entradas.reduce(
    (acc, item) =>
      acc + Number(item.valor || 0),
    0
  );

  const totalSaidas = despesas.reduce(
    (acc, item) =>
      acc + Number(item.valor || 0),
    0
  );

  const saldo =
    totalEntradas - totalSaidas;

  document
    .getElementById("totalEntradas")
    .textContent =
      formatarValor(totalEntradas);

  document
    .getElementById("totalSaidas")
    .textContent =
      formatarValor(totalSaidas);

  document
    .getElementById("saldo")
    .textContent =
      formatarValor(saldo);
}

/* =========================================================
   FECHAR CAIXA
========================================================= */
async function fecharCaixa() {
  if (
    !confirm(
      "Deseja realmente fechar o caixa?"
    )
  ) {
    return;
  }

  if (
    entradas.length === 0 &&
    despesas.length === 0
  ) {
    alert(
      "Não há dados para fechar o caixa!"
    );

    return;
  }

  const totalEntradas = entradas.reduce(
    (acc, item) =>
      acc + Number(item.valor || 0),
    0
  );

  const totalSaidas = despesas.reduce(
    (acc, item) =>
      acc + Number(item.valor || 0),
    0
  );

  const saldo =
    totalEntradas - totalSaidas;

  const totalComissoes =
    calcularTotalComissao();

  const movimentacoesFechadas =
    entradas.map(item => ({
      ...item,
      fechado: true
    }));

  const fechamento = {
    data: new Date(),
    totalEntradas,
    totalSaidas,
    saldo,
    totalComissoes,
    quantidadeEntradas: entradas.length,
    despesas,
    movimentacoes: movimentacoesFechadas
  };

  try {
    await db
      .collection("historicoCaixa")
      .add(fechamento);

    const batch = db.batch();

    entradas.forEach(item => {
      const ref = db
        .collection("atendimentos")
        .doc(item.id);

      batch.update(ref, {
        statusCaixa: "fechado"
      });
    });

    despesas.forEach(item => {
      if (item.id) {
        const ref = db
          .collection("despesas")
          .doc(item.id);

        batch.update(ref, {
          statusCaixa: "fechado"
        });
      }
    });

    await batch.commit();

    entradas = [];
    despesas = [];
    entradasFiltradas = [];
    paginaMovimentacoes = 1;

    limparTela();

    alert(
      "Caixa fechado e salvo com sucesso!"
    );

    const pdf = gerarPDF(fechamento);

    window.open(
      pdf.output("bloburl"),
      "_blank"
    );

  } catch (error) {
    alert(
      "Erro ao fechar caixa: " +
      error.message
    );
  }
}

/* =========================================================
   GERAR PDF
========================================================= */
function gerarPDF(fechamento) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  doc.setFontSize(16);

  doc.text(
    "Relatório de Caixa - Pit Stop",
    10,
    y
  );

  y += 10;

  doc.setFontSize(12);

  doc.text(
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
    10,
    y
  );

  y += 10;

  doc.text(
    `Entradas: ${formatarValor(fechamento.totalEntradas)}`,
    10,
    y
  );

  y += 8;

  doc.text(
    `Saídas: ${formatarValor(fechamento.totalSaidas)}`,
    10,
    y
  );

  y += 8;

  doc.text(
    `Saldo: ${formatarValor(fechamento.saldo)}`,
    10,
    y
  );

  y += 8;

  doc.text(
    `Comissões: ${formatarValor(fechamento.totalComissoes || 0)}`,
    10,
    y
  );

  y += 12;

  doc.text(
    "Movimentações:",
    10,
    y
  );

  y += 8;

  fechamento.movimentacoes.forEach(m => {
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

/* =========================================================
   BARRAS DE PAGAMENTO
========================================================= */
function atualizarGraficoPagamentos(
  dinheiro,
  pix,
  debito,
  credito
) {
  const total =
    dinheiro +
    pix +
    debito +
    credito || 1;

  document
    .getElementById("valorDinheiro")
    .textContent =
      formatarValor(dinheiro);

  document
    .getElementById("valorPix")
    .textContent =
      formatarValor(pix);

  document
    .getElementById("valorDebito")
    .textContent =
      formatarValor(debito);

  document
    .getElementById("valorCredito")
    .textContent =
      formatarValor(credito);

  document
    .getElementById("barDinheiro")
    .style.width =
      `${(dinheiro / total) * 100}%`;

  document
    .getElementById("barPix")
    .style.width =
      `${(pix / total) * 100}%`;

  document
    .getElementById("barDebito")
    .style.width =
      `${(debito / total) * 100}%`;

  document
    .getElementById("barCredito")
    .style.width =
      `${(credito / total) * 100}%`;
}

/* =========================================================
   LIMPAR TELA APÓS FECHAMENTO
========================================================= */
function limparTela() {
  document
    .getElementById("movimentacoes")
    .innerHTML = "";

  document
    .getElementById("faturamento")
    .textContent = formatarValor(0);

  document
    .getElementById("lavagens")
    .textContent = 0;

  document
    .getElementById("estacionamentos")
    .textContent = 0;

  document
    .getElementById("ticket")
    .textContent = formatarValor(0);

  document
    .getElementById("totalEntradas")
    .textContent = formatarValor(0);

  document
    .getElementById("totalSaidas")
    .textContent = formatarValor(0);

  document
    .getElementById("saldo")
    .textContent = formatarValor(0);

  const totalComissoes =
    document.getElementById("totalComissoes");

  if (totalComissoes) {
    totalComissoes.textContent =
      formatarValor(0);
  }

  const quantidadeComissoes =
    document.getElementById(
      "quantidadeComissoes"
    );

  if (quantidadeComissoes) {
    quantidadeComissoes.textContent =
      "0 lavagens com comissão";
  }

  renderizarDespesas();
  renderizarPaginacaoMovimentacoes();
}

/* =========================================================
   LOGOUT
========================================================= */
function logout() {
  firebase.auth()
    .signOut()
    .then(() => {
      window.location.href =
        "index.html";
    })
    .catch(error => {
      alert(
        "Erro ao sair: " +
        error.message
      );
    });
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    firebase.auth()
      .onAuthStateChanged(user => {
        if (!user) {
          window.location.href =
            "index.html";

          return;
        }

        carregarCaixa();
        carregarDespesasAbertas();
      });
  }
);

/* =========================================================
   PAGINAÇÃO DAS MOVIMENTAÇÕES
========================================================= */
function renderizarPaginacaoMovimentacoes() {
  let paginacao =
    document.getElementById(
      "paginacaoMovimentacoes"
    );

  if (!paginacao) {
    paginacao =
      document.createElement("div");

    paginacao.id =
      "paginacaoMovimentacoes";

    paginacao.className =
      "cash-pagination";

    const movimentacoes =
      document.getElementById(
        "movimentacoes"
      );

    movimentacoes.parentElement
      .appendChild(paginacao);
  }

  const totalPaginas = Math.ceil(
    entradasFiltradas.length /
    movimentacoesPorPagina
  );

  if (totalPaginas <= 1) {
    paginacao.innerHTML = "";
    return;
  }

  paginacao.innerHTML = `
    <button
      onclick="mudarPaginaMovimentacoes(-1)"
      ${paginaMovimentacoes === 1
        ? "disabled"
        : ""}
    >
      Anterior
    </button>

    <span>
      Página ${paginaMovimentacoes}
      de ${totalPaginas}
    </span>

    <button
      onclick="mudarPaginaMovimentacoes(1)"
      ${paginaMovimentacoes === totalPaginas
        ? "disabled"
        : ""}
    >
      Próxima
    </button>
  `;
}

function mudarPaginaMovimentacoes(
  direcao
) {
  const totalPaginas = Math.ceil(
    entradasFiltradas.length /
    movimentacoesPorPagina
  );

  paginaMovimentacoes += direcao;

  if (paginaMovimentacoes < 1) {
    paginaMovimentacoes = 1;
  }

  if (
    paginaMovimentacoes > totalPaginas
  ) {
    paginaMovimentacoes =
      totalPaginas;
  }

  atualizarTela();
}