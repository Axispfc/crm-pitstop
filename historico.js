let atendimentosHistorico = [];
let historicoClientes = [];
let historicoFiltrado = [];
let paginaAtual = 1;
const itensPorPagina = 15;

let periodoHistorico = "todos";

/* =========================
   CARREGAR HISTÓRICO
========================= */
async function carregarHistorico() {
  try {
    const snapshot = await db.collection("atendimentos").get();

    atendimentosHistorico = [];

    snapshot.forEach(doc => {
      atendimentosHistorico.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log("Dados carregados:", atendimentosHistorico);

    montarHistoricoComFiltros();

  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
  }
}

/* =========================
   PEGAR DATA DO REGISTRO
========================= */
function obterDataAtendimento(item) {
  if (item.entrada) {
    return item.entrada.toDate ? item.entrada.toDate() : new Date(item.entrada);
  }

  if (item.criadoEm) {
    return item.criadoEm.toDate ? item.criadoEm.toDate() : new Date(item.criadoEm);
  }

  if (item.finalizadoEm) {
    return item.finalizadoEm.toDate ? item.finalizadoEm.toDate() : new Date(item.finalizadoEm);
  }

  if (item.saida) {
    return item.saida.toDate ? item.saida.toDate() : new Date(item.saida);
  }

  if (item.data) {
    return new Date(item.data + "T12:00:00");
  }

  return null;
}

/* =========================
   MONTAR COM FILTROS
========================= */
function montarHistoricoComFiltros() {
  let inicio = new Date("2000-01-01T00:00:00");
  let fim = new Date();
  fim.setHours(23, 59, 59, 999);

  if (periodoHistorico === "hoje") {
    inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
  }

  if (periodoHistorico === "7dias") {
    inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    inicio.setHours(0, 0, 0, 0);
  }

  if (periodoHistorico === "30dias") {
    inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    inicio.setHours(0, 0, 0, 0);
  }

  if (periodoHistorico === "personalizado") {
    const dataInicio = document.getElementById("dataInicioHistorico")?.value;
    const dataFim = document.getElementById("dataFimHistorico")?.value;

    if (dataInicio) {
      inicio = new Date(dataInicio + "T00:00:00");
    }

    if (dataFim) {
      fim = new Date(dataFim + "T23:59:59");
    }
  }

  const tipoFiltro = document.getElementById("tipoFiltroHistorico")?.value || "Ambos";
  const termoBusca = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";

  const dadosFiltrados = atendimentosHistorico.filter(item => {
    const dataItem = obterDataAtendimento(item);

    let dentroPeriodo = true;

    if (periodoHistorico !== "todos") {
      if (!dataItem || isNaN(dataItem.getTime())) return false;
      dentroPeriodo = dataItem >= inicio && dataItem <= fim;
    }

    const dentroTipo = tipoFiltro === "Ambos" || item.tipoEntrada === tipoFiltro;

    const buscaOk =
      (item.nome || "").toLowerCase().includes(termoBusca) ||
      (item.placa || "").toLowerCase().includes(termoBusca) ||
      (item.veiculo || "").toLowerCase().includes(termoBusca) ||
      (item.telefone || "").toLowerCase().includes(termoBusca);

    return dentroPeriodo && dentroTipo && buscaOk;
  });

  atualizarMetricasELista(dadosFiltrados);
}

/* =========================
   MÉTRICAS + AGRUPAMENTO
========================= */
function atualizarMetricasELista(dados) {
  const totalAtendimentos = dados.length;

  const clientesMap = {};
  const servicosCount = {};
  const visitasPorMes = {};

  dados.forEach(item => {
    const nome = item.nome || "Sem nome";
    const dataAtendimento = obterDataAtendimento(item);

    if (!clientesMap[nome]) {
      clientesMap[nome] = {
        total: 0,
        lavagem: 0,
        estacionamento: 0,
        mensal: 0,
        ultimaVisita: null,
        ultimoAtendimentoId: item.id,
        placa: item.placa || "-",
        veiculo: item.veiculo || "-",
        telefone: item.telefone || "-"
      };
    }

    clientesMap[nome].total++;

    if (item.tipoEntrada === "Lavagem") {
      clientesMap[nome].lavagem++;
    }

    if (item.tipoEntrada === "Estacionamento") {
      clientesMap[nome].estacionamento++;
    }

    if (item.tipoEntrada === "Mensal") {
      clientesMap[nome].mensal++;
    }

    const servico = item.tipoEntrada || "Outro";
    servicosCount[servico] = (servicosCount[servico] || 0) + 1;

    if (dataAtendimento && !isNaN(dataAtendimento.getTime())) {
      const mes = `${dataAtendimento.getFullYear()}-${String(dataAtendimento.getMonth() + 1).padStart(2, "0")}`;
      visitasPorMes[mes] = (visitasPorMes[mes] || 0) + 1;

      if (
        !clientesMap[nome].ultimaVisita ||
        dataAtendimento > clientesMap[nome].ultimaVisita
      ) {
        clientesMap[nome].ultimaVisita = dataAtendimento;
        clientesMap[nome].ultimoAtendimentoId = item.id;
        clientesMap[nome].placa = item.placa || "-";
        clientesMap[nome].veiculo = item.veiculo || "-";
        clientesMap[nome].telefone = item.telefone || "-";
      }
    }
  });

  const clientesRecorrentes = Object.values(clientesMap)
    .filter(c => c.total > 1).length;

  let servicoMaisUsado = "-";
  let maior = 0;

  for (let s in servicosCount) {
    if (servicosCount[s] > maior) {
      maior = servicosCount[s];
      servicoMaisUsado = s;
    }
  }

  const totalMeses = Object.keys(visitasPorMes).length;
  const mediaVisitas = totalMeses > 0
    ? (totalAtendimentos / totalMeses).toFixed(1)
    : 0;

  document.getElementById("TotalAtendimentos").innerText = totalAtendimentos;
  document.getElementById("ClientesRecorrentes").innerText = clientesRecorrentes;
  document.getElementById("ServicoMaisUsado").innerText = servicoMaisUsado;
  document.getElementById("MediaVisitas").innerText = mediaVisitas;

  historicoClientes = Object.entries(clientesMap).map(([nome, dados]) => ({
    nome,
    ...dados
  }));

  historicoFiltrado = historicoClientes;
  paginaAtual = 1;
  renderizarHistoricoPaginado();
}

/* =========================
   PAGINAÇÃO
========================= */
function renderizarHistoricoPaginado() {
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const listaPagina = historicoFiltrado.slice(inicio, fim);

  renderizarHistorico(listaPagina);
  renderizarPaginacao();
}

function renderizarHistorico(lista) {
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  if (!lista.length) {
    container.innerHTML = `
      <div class="table-row">
        <span></span>
        <span></span>
        <span>Nenhum cliente encontrado</span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }

  const inicio = (paginaAtual - 1) * itensPorPagina;
  let id = inicio + 1;

  lista.forEach((dados) => {
    const linha = document.createElement("div");
    linha.className = "table-row";

    linha.innerHTML = `
      <span style="color: var(--text-dim); font-size: 0.8rem;">#${id++}</span>
      
      <span style="font-size: 0.8rem;">
        ${dados.ultimaVisita 
          ? dados.ultimaVisita.toLocaleDateString("pt-BR") 
          : "-"}
      </span>
      
      <span class="client-info">${dados.nome}</span>

      <span class="client-phone">${dados.telefone || "-"}</span>
      
      <span>
        <span class="vehicle-tag">${dados.placa}</span><br>
        <small style="color: var(--text-dim)">${dados.veiculo}</small>
      </span>
      
      <span class="service-summary">
        Lavagem: ${dados.lavagem} | Estac.: ${dados.estacionamento} | Mensal: ${dados.mensal}
      </span>
      
      <span style="text-align: center;">
        <span class="badge-visits">${dados.total}</span>
      </span>
      
      <span style="text-align: right;">
        <button class="btn-reabrir" onclick="reabrirAtendimento('${dados.ultimoAtendimentoId}')">
          Reabrir
        </button>
      </span>
    `;

    container.appendChild(linha);
  });
}

function renderizarPaginacao() {
  let paginacao = document.getElementById("paginacaoHistorico");

  if (!paginacao) {
    paginacao = document.createElement("div");
    paginacao.id = "paginacaoHistorico";
    paginacao.className = "pagination";

    const historyList = document.getElementById("historyList");
    historyList.parentElement.appendChild(paginacao);
  }

  const totalPaginas = Math.ceil(historicoFiltrado.length / itensPorPagina);

  if (totalPaginas <= 1) {
    paginacao.innerHTML = "";
    return;
  }

  paginacao.innerHTML = `
    <button onclick="mudarPaginaHistorico(-1)" ${paginaAtual === 1 ? "disabled" : ""}>
      Anterior
    </button>

    <span>Página ${paginaAtual} de ${totalPaginas}</span>

    <button onclick="mudarPaginaHistorico(1)" ${paginaAtual === totalPaginas ? "disabled" : ""}>
      Próxima
    </button>
  `;
}

function mudarPaginaHistorico(direcao) {
  const totalPaginas = Math.ceil(historicoFiltrado.length / itensPorPagina);

  paginaAtual += direcao;

  if (paginaAtual < 1) paginaAtual = 1;
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

  renderizarHistoricoPaginado();
}

/* =========================
   FILTROS
========================= */
function ativarFiltroHistorico() {
  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("input", montarHistoricoComFiltros);
  }

  const dataInicio = document.getElementById("dataInicioHistorico");
  const dataFim = document.getElementById("dataFimHistorico");
  const tipoFiltro = document.getElementById("tipoFiltroHistorico");

  if (dataInicio) {
    dataInicio.addEventListener("change", () => {
      periodoHistorico = "personalizado";
      montarHistoricoComFiltros();
    });
  }

  if (dataFim) {
    dataFim.addEventListener("change", () => {
      periodoHistorico = "personalizado";
      montarHistoricoComFiltros();
    });
  }

  if (tipoFiltro) {
    tipoFiltro.addEventListener("change", montarHistoricoComFiltros);
  }
}

function filtrarPeriodoHistorico(periodo) {
  periodoHistorico = periodo;

  document.querySelectorAll(".history-filters button").forEach(btn => {
    btn.classList.remove("active");
  });

  const botoes = document.querySelectorAll(".history-filters button");

  if (periodo === "hoje") botoes[0]?.classList.add("active");
  if (periodo === "7dias") botoes[1]?.classList.add("active");
  if (periodo === "30dias") botoes[2]?.classList.add("active");

  montarHistoricoComFiltros();
}

function aplicarFiltrosHistorico() {
  periodoHistorico = "personalizado";
  montarHistoricoComFiltros();
}

/* =========================
   REABRIR
========================= */
async function reabrirAtendimento(id) {
  if (!id) {
    alert("Atendimento não encontrado.");
    return;
  }

  await db.collection("atendimentos").doc(id).update({
    status: "Aberto",
    statusCaixa: "aberto",
    saida: firebase.firestore.FieldValue.delete(),
    finalizadoEm: firebase.firestore.FieldValue.delete(),
    valor: firebase.firestore.FieldValue.delete()
  });

  alert("Ficha reaberta mantendo o horário original!");
  window.location.href = "dashboard.html";
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  carregarHistorico();
  ativarFiltroHistorico();
});