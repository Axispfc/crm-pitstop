let atendimentos = [];
let paginaHistoricoFinanceiro = 1;
const itensHistoricoFinanceiro = 15;

/* FORMATAR VALOR */
function formatarValor(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* CONTROLE DE PERÍODOS E BOTÕES */
function definirPeriodo(tipo) {
  // Remove a classe active de todos os botões do filtro
  document.querySelectorAll(".filters button").forEach(btn => btn.classList.remove("active"));
  
  const hoje = new Date();
  let dataInicioStr = "";
  let dataFimStr = hoje.toISOString().split("T")[0]; // Hoje

  if (tipo === "hoje") {
    document.getElementById("btn-hoje").classList.add("active");
    dataInicioStr = dataFimStr;
  } 
  else if (tipo === "7dias") {
    document.getElementById("btn-7dias").classList.add("active");
    const dataInicio = new Date();
    dataInicio.setDate(hoje.getDate() - 7);
    dataInicioStr = dataInicio.toISOString().split("T")[0];
  } 
  else if (tipo === "30dias") {
    document.getElementById("btn-30dias").classList.add("active");
    const dataInicio = new Date();
    dataInicio.setDate(hoje.getDate() - 30);
    dataInicioStr = dataInicio.toISOString().split("T")[0];
  } 
  else if (tipo === "esteMes") {
    document.getElementById("btn-esteMes").classList.add("active");
    dataInicioStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Atualiza os inputs de data na tela e roda a busca
  document.getElementById("dataInicio").value = dataInicioStr;
  document.getElementById("dataFim").value = dataFimStr;
  
  carregarFinanceiro();
}

/* TRIGGER SE O USUÁRIO MEXER DIRETO NA DATA */
function MudarFiltroData() {
  // Se ele escolher uma data manual, remove o foco ativo dos botões pré-definidos
  document.querySelectorAll(".filters button").forEach(btn => btn.classList.remove("active"));
  carregarFinanceiro();
}

/* CARREGAR DADOS DO FIREBASE */
async function carregarFinanceiro() {
  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  if (!dataInicio || !dataFim) return;

  const inicioDate = new Date(dataInicio + "T00:00:00");
  const fimDate = new Date(dataFim + "T23:59:59");

  // OBJETO NOVO: Vai guardar o total de cada dia. Ex: {"2026-05-25": 450, "2026-05-26": 320}
  const faturamentoPorDia = {};

  // 1. Busca todos os Atendimentos finalizados
  const snapshotAtendimentos = await db
    .collection("atendimentos")
    .where("status", "==", "Finalizado")
    .get();

  atendimentos = [];
  snapshotAtendimentos.forEach(doc => {
    const dados = doc.data();
    
    if (dados.data && dados.data >= dataInicio && dados.data <= dataFim) {
      atendimentos.push(dados);

      // 👉 ADICIONADO: Soma o faturamento do dia específico para o gráfico
      const valor = dados.valor || 0;
      faturamentoPorDia[dados.data] = (faturamentoPorDia[dados.data] || 0) + valor;
    }
  });

  // 2. Busca o histórico de caixas para computar as Despesas lançadas
  let totalDespesasCaixa = 0;
  const resumoDespesasAgrupadas = {};

  const snapshotCaixa = await db
    .collection("historicoCaixa").get();

  snapshotCaixa.forEach(doc => {
    const dadosCaixa = doc.data();
    
    let dataCaixa = null;
    if (dadosCaixa.data && typeof dadosCaixa.data.toDate === "function") {
      dataCaixa = dadosCaixa.data.toDate();
    } else if (dadosCaixa.data) {
      dataCaixa = new Date(dadosCaixa.data);
    }

    if (dataCaixa && dataCaixa >= inicioDate && dataCaixa <= fimDate) {
      if (dadosCaixa.despesas && Array.isArray(dadosCaixa.despesas)) {
        dadosCaixa.despesas.forEach(itemDespesa => {
          const valor = itemDespesa.valor || 0;
          totalDespesasCaixa += valor;

          const desc = itemDespesa.desc || "Outros";
          resumoDespesasAgrupadas[desc] = (resumoDespesasAgrupadas[desc] || 0) + valor;
        });
      }
    }
  });

  // 3. Atualiza a tela enviando os dados mapeados do gráfico
  atualizarFinanceiro(totalDespesasCaixa, faturamentoPorDia); // 👈 Passando por parâmetro aqui
  montarResumoDespesas(resumoDespesasAgrupadas);
  
}

/* ATUALIZAR INTERFACE */
function atualizarFinanceiro(despesas = 0, faturamentoPorDia = {})  {
  let total = 0;
  let totalLavagens = 0;
  let totalEstacionamentos = 0;
  let qtdLavagens = 0;
  let qtdEstacionamentos = 0;

  let dinheiro = 0, pix = 0, debito = 0, credito = 0;
  const servicos = {};

  atendimentos.forEach(item => {
    const valor = item.valor || 0;
    total += valor;

    if (item.tipoEntrada === "Lavagem") {
      totalLavagens += valor;
      qtdLavagens++;
    }

    if (item.tipoEntrada === "Estacionamento") {
      totalEstacionamentos += valor;
      qtdEstacionamentos++;
    }

    const pagamento = item.pagamento || "Dinheiro";
    if (pagamento === "Dinheiro") dinheiro += valor;
    if (pagamento === "Pix") pix += valor;
    if (pagamento === "Débito") debito += valor;
    if (pagamento === "Crédito") credito += valor;

    const servico = item.servico || item.tipoEntrada || "Outros";
    servicos[servico] = (servicos[servico] || 0) + valor;
  });

  const lucro = total - despesas;

  // Injeta nos KPIs superiores
  document.getElementById("faturamentoBruto").textContent = formatarValor(total);
  document.getElementById("totalLavagens").textContent = formatarValor(totalLavagens);
  document.getElementById("qtdLavagens").textContent = `${qtdLavagens} atendimentos`;
  document.getElementById("totalEstacionamentos").textContent = formatarValor(totalEstacionamentos);
  document.getElementById("qtdEstacionamentos").textContent = `${qtdEstacionamentos} encerrados`;
  document.getElementById("totalDespesas").textContent = formatarValor(despesas);
  document.getElementById("lucroLiquido").textContent = formatarValor(lucro);

  // Injeta na rosquinha / área de pagamento
  document.getElementById("totalPagamentos").textContent = formatarValor(total);
  document.getElementById("pagDinheiro").textContent = formatarValor(dinheiro);
  document.getElementById("pagPix").textContent = formatarValor(pix);
  document.getElementById("pagDebito").textContent = formatarValor(debito);
  document.getElementById("pagCredito").textContent = formatarValor(credito);

  // Barras de progresso de Categoria
  const percentLav = total > 0 ? Math.round((totalLavagens / total) * 100) : 0;
  const percentEst = total > 0 ? Math.round((totalEstacionamentos / total) * 100) : 0;

  document.getElementById("percentLavagens").textContent = `${percentLav}%`;
  document.getElementById("percentEstacionamentos").textContent = `${percentEst}%`;
  document.getElementById("barLavagens").style.width = `${percentLav}%`;
  document.getElementById("barEstacionamentos").style.width = `${percentEst}%`;

  montarResumoServicos(servicos);
  montarHistorico();
  montarGrafico(faturamentoPorDia);
}

function montarResumoServicos(servicos) {
  const box = document.getElementById("resumoServicos");
  box.innerHTML = "";

  Object.keys(servicos).forEach(nome => {
    box.innerHTML += `
      <p>
        <span>${nome}</span>
        <strong>${formatarValor(servicos[nome])}</strong>
      </p>
    `;
  });

  if (!Object.keys(servicos).length) {
    box.innerHTML = `<p class="empty">Nenhum serviço encontrado.</p>`;
  }
}

/* NOVO: PREENCHE O CARD DE DESPESAS POR CATEGORIA QUE ESTAVA VAZIO */
function montarResumoDespesas(despesasAgrupadas) {
  const box = document.getElementById("resumoDespesas");
  box.innerHTML = "";

  const chaves = Object.keys(despesasAgrupadas);

  chaves.forEach(nome => {
    box.innerHTML += `
      <p style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${nome}</span>
        <strong style="color: #e74c3c;">${formatarValor(despesasAgrupadas[nome])}</strong>
      </p>
    `;
  });

  if (chaves.length === 0) {
    box.innerHTML = `<p class="empty">Nenhuma despesa lançada.</p>`;
  }
}

function montarHistorico() {
  const box = document.getElementById("historicoFinanceiro");
  box.innerHTML = "";

  const inicio = (paginaHistoricoFinanceiro - 1) * itensHistoricoFinanceiro;
  const fim = inicio + itensHistoricoFinanceiro;
  const listaPagina = atendimentos.slice(inicio, fim);

  listaPagina.forEach(item => {
    box.innerHTML += `
      <div class="history-row">
        <span>${item.nome || "-"}</span>
        <span>${item.veiculo || "-"}</span>
        <span>${item.placa || "-"}</span>
        <span>${item.tipoEntrada || "-"}</span>
        <span>${item.servico || "-"}</span>
        <span>${formatarValor(item.valor || 0)}</span>
        <span>${item.pagamento || "Dinheiro"}</span>
      </div>
    `;
  });

  renderizarPaginacaoFinanceiro();
}

  if (atendimentos.length === 0) {
    box.innerHTML = `<p class="empty" style="padding: 20px; text-align: center; color: #999;">Nenhum registro encontrado para este período.</p>`;
  }
}

function montarGrafico(faturamentoPorDia) {
  const grafico = document.getElementById("graficoDias");
  if (!grafico) return;
  grafico.innerHTML = "";

  // 1. Pega todas as datas filtradas e organiza em ordem cronológica (da mais antiga para a mais recente)
  const diasOrdenados = Object.keys(faturamentoPorDia).sort();

  if (diasOrdenados.length === 0) {
    grafico.innerHTML = `<p class="empty" style="color: #999; font-size: 14px; margin: auto;">Sem dados de faturamento para o período.</p>`;
    return;
  }

  // 2. Descobre qual foi o maior faturamento diário para criar a proporção do gráfico (regrade 3)
  const maiorFaturamento = Math.max(...Object.values(faturamentoPorDia));

  // 3. Cria as barras dinamicamente
  diasOrdenados.forEach(dataStr => {
    const totalDoDia = faturamentoPorDia[dataStr];
    
    // Calcula a porcentagem da altura (se o maior dia foi R$1000 e hoje foi R$500, a altura é 50%)
    // Se o maior faturamento for 0, definimos 1% para não quebrar a divisão
    const alturaPercentual = maiorFaturamento > 0 ? (totalDoDia / maiorFaturamento) * 100 : 0;

    // Formata a data de "AAAA-MM-DD" para "DD/MM" para exibir no gráfico
    const [ano, mes, dia] = dataStr.split("-");
    const dataFormatada = `${dia}/${mes}`;

    // Cria o elemento da barra
    const barraContainer = document.createElement("div");
    barraContainer.className = "chart-bar-container";
    barraContainer.style.display = "flex";
    barraContainer.style.flexDirection = "column";
    barraContainer.style.alignItems = "center";
    barraContainer.style.height = "100%";
    barraContainer.style.justifyContent = "flex-end";
    barraContainer.style.flex = "1";
    barraContainer.style.minWidth = "25px";

    // Injeta a barra e a legenda da data abaixo dela
    // O atributo 'title' cria uma caixinha com o valor exato quando passa o mouse por cima!
    barraContainer.innerHTML = `
      <div class="chart-bar" 
           title="Dia ${dataFormatada}: ${formatarValor(totalDoDia)}" 
           style="height: ${Math.max(alturaPercentual, 5)}%; 
                  width: 65%; 
                  background: linear-gradient(to top, #2ecc71, #27ae60); 
                  border-radius: 4px 4px 0 0; 
                  transition: height 0.5s ease;
                  cursor: pointer;">
      </div>
      <span style="font-size: 11px; color: #7f8c8d; margin-top: 5px; font-weight: 500;">${dataFormatada}</span>
    `;

    grafico.appendChild(barraContainer);
  });
}

/* STARTUP DO SISTEMA */
document.addEventListener("DOMContentLoaded", () => {
  // Inicia mostrando os últimos 30 dias por padrão para a tela vir cheia e bonita
  definirPeriodo("30dias");
});

function renderizarPaginacaoFinanceiro() {
  let paginacao = document.getElementById("paginacaoFinanceiro");

  if (!paginacao) {
    paginacao = document.createElement("div");
    paginacao.id = "paginacaoFinanceiro";
    paginacao.className = "finance-pagination";

    const historico = document.getElementById("historicoFinanceiro");
    historico.parentElement.appendChild(paginacao);
  }

  const totalPaginas = Math.ceil(atendimentos.length / itensHistoricoFinanceiro);

  if (totalPaginas <= 1) {
    paginacao.innerHTML = "";
    return;
  }

  paginacao.innerHTML = `
    <button onclick="mudarPaginaFinanceiro(-1)" ${paginaHistoricoFinanceiro === 1 ? "disabled" : ""}>
      ◀ Anterior
    </button>

    <span>${paginaHistoricoFinanceiro} / ${totalPaginas}</span>

    <button onclick="mudarPaginaFinanceiro(1)" ${paginaHistoricoFinanceiro === totalPaginas ? "disabled" : ""}>
      Próxima ▶
    </button>
  `;
}

function mudarPaginaFinanceiro(direcao) {
  const totalPaginas = Math.ceil(atendimentos.length / itensHistoricoFinanceiro);

  paginaHistoricoFinanceiro += direcao;

  if (paginaHistoricoFinanceiro < 1) paginaHistoricoFinanceiro = 1;
  if (paginaHistoricoFinanceiro > totalPaginas) paginaHistoricoFinanceiro = totalPaginas;

  montarHistorico();
}