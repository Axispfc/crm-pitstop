let atendimentos = [];

function formatarValor(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function carregarFinanceiro() {
  // 1. Busca as receitas (Atendimentos)
  const snapshotAtendimentos = await db
    .collection("atendimentos")
    .where("status", "==", "Finalizado")
    .get();

  atendimentos = [];
  snapshotAtendimentos.forEach(doc => {
    atendimentos.push(doc.data());
  });

  // 2. Busca as despesas na coleção 'historicoCaixa'
  let totalDespesasCaixa = 0;
  
  const snapshotCaixa = await db
    .collection("historicoCaixa")
    .get();

  snapshotCaixa.forEach(doc => {
    const dadosCaixa = doc.data();
    
    // Verifica se existe o campo "despesas" e se ele é uma lista (array)
    if (dadosCaixa.despesas && Array.isArray(dadosCaixa.despesas)) {
      // Percorre cada despesa lançada neste caixa e soma o valor
      dadosCaixa.despesas.forEach(itemDespesa => {
        totalDespesasCaixa += (itemDespesa.valor || 0);
      });
    }

    /* DICA: Como vi na sua imagem que existe o campo "totalSaidas" dentro de "movimentacoes", 
      se preferir, você poderia substituir o bloco 'if' acima por apenas esta linha:
      
      totalDespesasCaixa += (dadosCaixa.movimentacoes?.totalSaidas || 0);
    */
  });

  // 3. Passa o valor das despesas para a função que atualiza a tela
  atualizarFinanceiro(totalDespesasCaixa);
}

// Recebe o total das despesas por parâmetro
function atualizarFinanceiro(despesas = 0) {
  let total = 0;
  let totalLavagens = 0;
  let totalEstacionamentos = 0;
  let qtdLavagens = 0;
  let qtdEstacionamentos = 0;

  let dinheiro = 0;
  let pix = 0;
  let debito = 0;
  let credito = 0;

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

  // O cálculo do lucro líquido usando o valor que veio do banco de dados
  const lucro = total - despesas;

  document.getElementById("faturamentoBruto").textContent = formatarValor(total);
  document.getElementById("totalLavagens").textContent = formatarValor(totalLavagens);
  document.getElementById("qtdLavagens").textContent = `${qtdLavagens} atendimentos`;
  document.getElementById("totalEstacionamentos").textContent = formatarValor(totalEstacionamentos);
  document.getElementById("qtdEstacionamentos").textContent = `${qtdEstacionamentos} encerrados`;
  
  // Exibindo as Despesas e o Lucro
  document.getElementById("totalDespesas").textContent = formatarValor(despesas);
  document.getElementById("lucroLiquido").textContent = formatarValor(lucro);

  document.getElementById("totalPagamentos").textContent = formatarValor(total);
  document.getElementById("pagDinheiro").textContent = formatarValor(dinheiro);
  document.getElementById("pagPix").textContent = formatarValor(pix);
  document.getElementById("pagDebito").textContent = formatarValor(debito);
  document.getElementById("pagCredito").textContent = formatarValor(credito);

  const percentLav = total > 0 ? Math.round((totalLavagens / total) * 100) : 0;
  const percentEst = total > 0 ? Math.round((totalEstacionamentos / total) * 100) : 0;

  document.getElementById("percentLavagens").textContent = `${percentLav}%`;
  document.getElementById("percentEstacionamentos").textContent = `${percentEst}%`;
  document.getElementById("barLavagens").style.width = `${percentLav}%`;
  document.getElementById("barEstacionamentos").style.width = `${percentEst}%`;

  montarResumoServicos(servicos);
  montarHistorico();
  montarGrafico(total);
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

function montarHistorico() {
  const box = document.getElementById("historicoFinanceiro");
  box.innerHTML = "";

  atendimentos.forEach(item => {
    box.innerHTML += `
      <div class="history-row">
        <span>${item.nome || "-"}</span>
        <span>${item.placa || "-"}</span>
        <span>${item.tipoEntrada || "-"}</span>
        <span>${item.servico || "-"}</span>
        <span>${formatarValor(item.valor || 0)}</span>
        <span>${item.pagamento || "Dinheiro"}</span>
      </div>
    `;
  });
}

function montarGrafico(total) {
  const grafico = document.getElementById("graficoDias");
  grafico.innerHTML = "";

  const valores = [35, 50, 42, 70, 55, 80, 65, 90, 72, 60, 76, 88];

  valores.forEach(v => {
    grafico.innerHTML += `<div class="chart-bar" style="height:${v}%"></div>`;
  });
}

carregarFinanceiro();