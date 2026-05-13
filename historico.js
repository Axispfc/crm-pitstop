async function carregarHistorico() {
  const container = document.getElementById("historicoLista");

  const snapshot = await db.collection("historicoCaixa")
    .orderBy("data", "desc")
    .get();

  container.innerHTML = "";

  snapshot.forEach(doc => {
    const d = doc.data();

    const data = new Date(d.data.seconds * 1000);

    container.innerHTML += `
      <div class="row">
        <span>${data.toLocaleDateString()}</span>
        <span>${formatarValor(d.totalEntradas)}</span>
        <span style="color:red">${formatarValor(d.totalSaidas)}</span>
        <span style="color:#00ff99">${formatarValor(d.saldo)}</span>
        <span class="actions">
          <button class="btn-view" onclick="verDetalhesPorId('${doc.id}')">Ver</button>
          <button class="btn-pdf" onclick="gerarPDF('${doc.id}')">PDF</button>
        </span>
      </div>
    `;
  });
}
function formatarValor(valor) {
  return (valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
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
document.addEventListener("DOMContentLoaded", carregarHistorico);document.addEventListener("DOMContentLoaded", () => {
  console.log("HISTÓRICO INICIADO");
  carregarHistorico();
});