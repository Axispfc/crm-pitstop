async function carregarHistorico() {
  try {
    const snapshot = await db.collection("atendimentos").get();

    const dados = [];

    snapshot.forEach(doc => {
      dados.push(doc.data());
    });

    console.log("Dados carregados:", dados);

    // =========================
    // 📊 MÉTRICAS
    // =========================

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

// SERVIÇOS
      const servico = item.tipoEntrada || "Outro";
      servicosCount[servico] = (servicosCount[servico] || 0) + 1;

       // MÊS
      if (item.data) {
        const mes = item.data.slice(0, 7);
        visitasPorMes[mes] = (visitasPorMes[mes] || 0) + 1;
      }
      
// 🧠 PEGAR ÚLTIMA VISITA (A MAIS RECENTE)
if (item.entrada) {
  const data = item.entrada.toDate ? item.entrada.toDate() : new Date(item.entrada);

  if (
    !clientesMap[nome].ultimaVisita ||
    data > clientesMap[nome].ultimaVisita
  ) {
    clientesMap[nome].ultimaVisita = data;
  }
}
    });

    // =========================
    // RESULTADOS
    // =========================

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

    // =========================
    // ATUALIZAR HTML
    // =========================

    document.getElementById("TotalAtendimentos").innerText = totalAtendimentos;
    document.getElementById("ClientesRecorrentes").innerText = clientesRecorrentes;
    document.getElementById("ServicoMaisUsado").innerText = servicoMaisUsado;
    document.getElementById("MediaVisitas").innerText = mediaVisitas;

    // =========================
    // LISTA
    // =========================

   const container = document.getElementById("historyList");
container.innerHTML = "";

let id = 1;

Object.entries(clientesMap).forEach(([nome, dados]) => {
  const linha = document.createElement("div");
  linha.className = "table-row";

  linha.innerHTML = `
    <span style="color: var(--text-dim); font-size: 0.8rem;">#${id++}</span>
    
    <span style="font-size: 0.8rem;">
      ${dados.ultimaVisita 
        ? dados.ultimaVisita.toLocaleDateString("pt-BR") 
        : '-'}
    </span>
    
    <span class="client-info">${nome}</span>
    
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

  


     
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
  }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  carregarHistorico();
});