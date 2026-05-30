let historicoClientes = [];
let historicoFiltrado = [];
let paginaAtual = 1;
const itensPorPagina = 15;

async function carregarHistorico() {
  try {
    const snapshot = await db.collection("atendimentos").get();

    const dados = [];

    snapshot.forEach(doc => {
      dados.push(doc.data());
    });

    console.log("Dados carregados:", dados);

    const totalAtendimentos = dados.length;

    const clientesMap = {};
    const servicosCount = {};
    const visitasPorMes = {};

    dados.forEach(item => {
      const nome = item.nome || "Sem nome";

      if (!clientesMap[nome]) {
        clientesMap[nome] = {
          total: 0,
          lavagem: 0,
          estacionamento: 0,
          ultimaVisita: null,
          placa: item.placa || "-",
          veiculo: item.veiculo || "-"
        };
      }

      clientesMap[nome].total++;

      if (item.tipoEntrada === "Lavagem") {
        clientesMap[nome].lavagem++;
      }

      if (item.tipoEntrada === "Estacionamento") {
        clientesMap[nome].estacionamento++;
      }

      const servico = item.tipoEntrada || "Outro";
      servicosCount[servico] = (servicosCount[servico] || 0) + 1;

      if (item.data) {
        const mes = item.data.slice(0, 7);
        visitasPorMes[mes] = (visitasPorMes[mes] || 0) + 1;
      }

      if (item.entrada) {
        const data = item.entrada.toDate ? item.entrada.toDate() : new Date(item.entrada);

        if (!clientesMap[nome].ultimaVisita || data > clientesMap[nome].ultimaVisita) {
          clientesMap[nome].ultimaVisita = data;
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

  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
  }
}

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
          : '-'}
      </span>
      
      <span class="client-info">${dados.nome}</span>
      
      <span>
        <span class="vehicle-tag">${dados.placa}</span><br>
        <small style="color: var(--text-dim)">${dados.veiculo}</small>
      </span>
      
      <span class="service-summary">
        Lavagem: ${dados.lavagem} | Estac.: ${dados.estacionamento}
      </span>
      
      <span style="text-align: center;">
        <span class="badge-visits">${dados.total}</span>
      </span>
      
      <span style="text-align: right;">
        <button class="btn-action">
          <i class="fa-solid fa-eye"></i>
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

function ativarFiltroHistorico() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) return;

  searchInput.addEventListener("input", function () {
    const termo = this.value.toLowerCase().trim();

    const filtrados = historicoClientes.filter((item) => {
      return (
        (item.nome || "").toLowerCase().includes(termo) ||
        (item.placa || "").toLowerCase().includes(termo) ||
        (item.veiculo || "").toLowerCase().includes(termo)
      );
    });

    historicoFiltrado = filtrados;
paginaAtual = 1;
renderizarHistoricoPaginado();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  carregarHistorico();
  ativarFiltroHistorico();
});