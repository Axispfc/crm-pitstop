const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const systemScreen = document.getElementById("systemScreen");
const logoutBtn = document.getElementById("logoutBtn");

const parkingOptions = document.getElementById("parkingOptions");
const vehicleForm = document.getElementById("vehicleForm");
const washOptions = document.getElementById("washOptions");
const valorFixoOptions = document.getElementById("valorFixoOptions");
const tituloValorFixo = document.getElementById("tituloValorFixo");
const inputValorFixo = document.getElementById("valorFixo");

const tipoEntradaInputs = document.querySelectorAll("input[name='tipoEntrada']");
const listaEstacionamento = document.getElementById("listaEstacionamento");
const coupon = document.getElementById("coupon");
const cupomConteudo = document.getElementById("cupomConteudo");

let atendimentoPendente = null;
let estacionados = [];
let editId = null;

/* CONTROLE DE EXIBIÇÃO */
tipoEntradaInputs.forEach((input) => {
  input.addEventListener("change", function () {
    const tipo = this.value;
    const usaValorFixo = tipo === "Mensal" || tipo === "Diária";

    washOptions.classList.toggle("hidden", tipo !== "Lavagem");
    parkingOptions.classList.toggle("hidden", tipo !== "Estacionamento");
    valorFixoOptions.classList.toggle("hidden", !usaValorFixo);

    if (tipo === "Mensal") {
      tituloValorFixo.textContent = "Valor da mensalidade";
      inputValorFixo.placeholder = "Informe o valor da mensalidade";
    }

    if (tipo === "Diária") {
      tituloValorFixo.textContent = "Valor da diária";
      inputValorFixo.placeholder = "Informe o valor da diária";
    }
  });
});

/* PREÇO LAVAGEM */
function calcularLavagem(tipoVeiculo, servico, cera) {
  const tipo = String(tipoVeiculo || "").trim();
  const nomeServico = String(servico || "").trim();

  let valor = 0;

  if (nomeServico === "Lavagem completa") {
    if (tipo === "Hatch") valor = 45;
    else if (tipo === "Sedan") valor = 50;
    else if (tipo === "SUV") valor = 60;
    else if (tipo === "Moto") valor = 45;
    else if (tipo === "Caminhonete") valor = 80;
  }

  if (nomeServico === "Lavagem rápida") {
    valor = 20;
  }

  if (nomeServico === "Ducha com secagem") {
    valor = 30;
  }

  if (cera === true || cera === "true") {
    valor += 10;
  }

  console.log("Cálculo da lavagem:", {
    tipo,
    nomeServico,
    cera,
    valor
  });

  return valor;
}

/* PREÇO ESTACIONAMENTO */
function calcularEstacionamento(entrada, saida, tipoEstacionamento = "Carro Comum") {
  const diffHoras = (saida - entrada) / (1000 * 60 * 60);

  let valorPrimeiraHora = 10;
  let valorHoraAdicional = 4;

  const tipo = tipoEstacionamento ? tipoEstacionamento.trim() : "Carro Comum";

  if (tipo === "Moto") {
    valorPrimeiraHora = 8;
    valorHoraAdicional = 4;
  } else if (tipo === "Carro Grande") {
    valorPrimeiraHora = 10;
    valorHoraAdicional = 5;
  }

  if (diffHoras <= 1) {
    return valorPrimeiraHora;
  }

  return valorPrimeiraHora + Math.ceil(diffHoras - 1) * valorHoraAdicional;
}

/* FORMATADORES */
const formatarData = (d) => d.toLocaleDateString("pt-BR");

const formatarHora = (d) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const formatarValor = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/* CARREGAR ABERTOS */
function carregarEstacionamentosAbertos() {
  db.collection("atendimentos")
    .where("status", "==", "Aberto")
    .onSnapshot((snapshot) => {
      estacionados = [];

      snapshot.forEach((doc) => {
        const d = doc.data();

        estacionados.push({
          id: doc.id,
          nome: d.nome,
          veiculo: d.veiculo,
          placa: d.placa,
          telefone: d.telefone,
          entrada: d.entrada?.toDate ? d.entrada.toDate() : new Date(d.entrada),
          status: d.status,
          tipoEntrada: d.tipoEntrada,
          servico: d.servico || null,
          servicoadicional: d.servicoadicional || null,
          precoAdicional: d.precoAdicional || null,
          tipoEstacionamento: d.tipoEstacionamento || null,
          tipoVeiculo: d.tipoVeiculo || null,
          pagamento: d.pagamento || null,
          cera: d.cera || false,
          valor: d.valor || null,
        });
      });

      atualizarListaEstacionamento();
    });
}

/* CADASTRO & EDIÇÃO */
if (vehicleForm) {
  vehicleForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const veiculo = document.getElementById("veiculo").value;
    const placa = document.getElementById("placa").value.toUpperCase();
    const telefone = document.getElementById("telefone").value;
    const tipoEntrada = document.querySelector("input[name='tipoEntrada']:checked").value;

    await db.collection("clientes").doc(placa).set({
      nome,
      veiculo,
      telefone,
      placa,
      atualizadoEm: new Date(),
    }, { merge: true });

    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const hora = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let dadosAtendimento = { nome, veiculo, placa, telefone, tipoEntrada };

    /* ESTACIONAMENTO */
    if (tipoEntrada === "Estacionamento") {
      const tipoEstacionamento =
        document.querySelector("input[name='tipoEstacionamento']:checked")?.value;

      dadosAtendimento.tipoEstacionamento = tipoEstacionamento || "Carro Comum";

      if (!editId) {
        dadosAtendimento.status = "Aberto";
        dadosAtendimento.entrada = agora;
        dadosAtendimento.criadoEm = agora;
        dadosAtendimento.data = hoje;
        dadosAtendimento.hora = hora;
        dadosAtendimento.statusCaixa = "aberto";
      }
    }

    /* LAVAGEM */
    if (tipoEntrada === "Lavagem") {
      const tipoVeiculo =
        document.querySelector("input[name='tipoVeiculo']:checked")?.value;

      const servico = document.getElementById("servico").value;
      const ceraCheckbox = document.getElementById("cera");
      const temCera = ceraCheckbox ? ceraCheckbox.checked : false;

      const servicoadicional = document.getElementById("servicoad").value;
      const precoAdicional = document.getElementById("precoAd").value;

      if (!tipoVeiculo) return alert("Selecione o tipo de veículo.");
      if (tipoVeiculo !== "Moto" && !servico) return alert("Selecione o serviço.");

      const valor =
        calcularLavagem(tipoVeiculo, servico, temCera) +
        (precoAdicional ? parseFloat(precoAdicional) : 0);

      dadosAtendimento = {
        ...dadosAtendimento,
        tipoVeiculo,
        servico,
        cera: temCera,
        valor,
        servicoadicional,
        precoAdicional,
      };

      if (!editId) {
        dadosAtendimento.status = "Aberto";
        dadosAtendimento.entrada = agora;
        dadosAtendimento.criadoEm = agora;
        dadosAtendimento.data = hoje;
        dadosAtendimento.hora = hora;
        dadosAtendimento.statusCaixa = "aberto";
      }
    }

    /* MENSAL OU DIÁRIA */
if (tipoEntrada === "Mensal" || tipoEntrada === "Diária") {
  const campoValorFixo = document.getElementById("valorFixo");

  const valorFixo = parseFloat(
    String(campoValorFixo.value || "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  if (isNaN(valorFixo) || valorFixo <= 0) {
    const nomeValor =
      tipoEntrada === "Mensal"
        ? "mensalidade"
        : "diária";

    return alert(`Informe o valor da ${nomeValor}.`);
  }

  dadosAtendimento = {
    ...dadosAtendimento,
    valor: valorFixo,
    servico:
      tipoEntrada === "Mensal"
        ? "Mensalidade"
        : "Diária de estacionamento",

    status: "Aberto",
    entrada: agora,
    criadoEm: agora,
    data: hoje,
    hora,
    statusCaixa: "aberto"
  };
}


    /* SALVAR */
if (editId) {
  await db
    .collection("atendimentos")
    .doc(editId)
    .update(dadosAtendimento);

  alert("Cadastro atualizado com sucesso!");

  editId = null;

  const btnSubmit = vehicleForm.querySelector(
    "button[type='submit']"
  );

  if (btnSubmit) {
    btnSubmit.textContent = "Cadastrar";
  }

} else {
  const docRef = await db
    .collection("atendimentos")
    .add(dadosAtendimento);

  const atendimentoSalvo = {
    id: docRef.id,
    ...dadosAtendimento,
    entrada: agora
  };

  if (tipoEntrada === "Estacionamento") {
    gerarCupomEstacionamento(atendimentoSalvo);
  }

  if (tipoEntrada === "Lavagem") {
    gerarCupomLavagem({
      ...atendimentoSalvo,
      data: agora
    });
  }

  if (
    tipoEntrada === "Mensal" ||
    tipoEntrada === "Diária"
  ) {
    gerarCupomValorFixo({
      ...atendimentoSalvo,
      data: agora
    });
  }
}
    vehicleForm.reset();
    washOptions.classList.add("hidden");
    parkingOptions.classList.add("hidden");
   valorFixoOptions.classList.add("hidden");
inputValorFixo.value = "";
  });
}

/* LISTA */
function atualizarListaEstacionamento() {
  listaEstacionamento.innerHTML = "";

  estacionados.forEach((v) => {
    const tempo = v.tipoEntrada === "Estacionamento"
      ? (() => {
          const m = Math.floor((Date.now() - v.entrada) / 60000);
          return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
        })()
      : "-";

    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <span>${v.placa}</span>
      <span>${v.veiculo}</span>
      <span>${v.nome}</span>
      <span class="tipo ${v.tipoEntrada === "Lavagem" ? "lavagem" : "estacionamento"}">${v.tipoEntrada}</span>
      <span>${tempo}</span>
      <span class="status aberto">${v.status}</span>
      <span class="actions">
        <button onclick="verCupom('${v.id}')" title="Ver Cupom">🧾</button>
        <button onclick="window.location.href='dashboard.html?editar=${v.id}'" title="Editar">✏</button>
        ${
  v.tipoEntrada === "Lavagem"
    ? `<button onclick="finalizarLavagem('${v.id}')" title="Finalizar">✔</button>`
    : `<button onclick="encerrarEstacionamento('${v.id}')" title="Finalizar">✔</button>`
}
      </span>
    `;

    listaEstacionamento.appendChild(row);
  });
}

/* EDITAR */
function abrirEdicao(id) {
  const v = estacionados.find(i => i.id === id);

  if (!v) {
    alert("Registro não encontrado");
    return;
  }

  editId = id;

  document.getElementById("nome").value = v.nome || "";
  document.getElementById("veiculo").value = v.veiculo || "";
  document.getElementById("placa").value = v.placa || "";
  document.getElementById("telefone").value = v.telefone || "";

  const inputTipoEntrada = document.querySelector(
    `input[name='tipoEntrada'][value='${v.tipoEntrada}']`
  );

  if (inputTipoEntrada) {
    inputTipoEntrada.checked = true;
  }

  washOptions.classList.toggle(
    "hidden",
    v.tipoEntrada !== "Lavagem"
  );

  parkingOptions.classList.toggle(
    "hidden",
    v.tipoEntrada !== "Estacionamento"
  );

  const usaValorFixo =
    v.tipoEntrada === "Mensal" ||
    v.tipoEntrada === "Diária";

  valorFixoOptions.classList.toggle(
    "hidden",
    !usaValorFixo
  );

  if (v.tipoEntrada === "Mensal") {
    tituloValorFixo.textContent = "Valor da mensalidade";
    inputValorFixo.placeholder = "Informe o valor da mensalidade";
    inputValorFixo.value = v.valor || "";
  }

  if (v.tipoEntrada === "Diária") {
    tituloValorFixo.textContent = "Valor da diária";
    inputValorFixo.placeholder = "Informe o valor da diária";
    inputValorFixo.value = v.valor || "";
  }

  if (v.tipoEntrada === "Estacionamento") {
    const inputTipoEst = document.querySelector(
      `input[name='tipoEstacionamento'][value='${v.tipoEstacionamento}']`
    );

    if (inputTipoEst) {
      inputTipoEst.checked = true;
    }
  }

  if (v.tipoEntrada === "Lavagem") {
    const inputTipoVeic = document.querySelector(
      `input[name='tipoVeiculo'][value='${v.tipoVeiculo}']`
    );

    if (inputTipoVeic) {
      inputTipoVeic.checked = true;
    }

    document.getElementById("servico").value = v.servico || "";
    document.getElementById("servicoad").value =
      v.servicoadicional || "";

    document.getElementById("precoAd").value =
      v.precoAdicional || "";

    const inputCera = document.getElementById("cera");

    if (inputCera) {
      inputCera.checked =
        v.cera === true ||
        v.cera === "true";
    }
  }

  const btnSubmit = vehicleForm.querySelector(
    "button[type='submit']"
  );

  if (btnSubmit) {
    btnSubmit.textContent = "Salvar Alterações";
  }

  vehicleForm.scrollIntoView({
    behavior: "smooth"
  });
}


/* CUPOM */
function verCupom(id) {
  const v = estacionados.find(i => i.id === id);
  if (!v) return alert("Não encontrado");

  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> ${v.tipoEntrada}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p><strong>Placa:</strong> ${v.placa}</p>
    <p><strong>Serviço Adicional:</strong> ${v.servicoadicional || "Nenhum"}</p>
    <p><strong>Valor Adicional:</strong> ${v.precoAdicional ? formatarValor(v.precoAdicional) : "Nenhum"}</p>
    <p><strong>Valor:</strong> ${v.valor ? formatarValor(v.valor) : "A calcular"}</p>
    <p><strong>Entrada:</strong> ${formatarData(v.entrada)} ${formatarHora(v.entrada)}</p>
  `;
}

function fecharCupom() {
  coupon.classList.add("hidden");
}

function mostrarPagamentoComanda(v) {
  if (v.pagamento === "Dinheiro/Crédito") {
    return `
      Dinheiro: ${formatarValor(v.valorDinheiro)}<br>
      Crédito: ${formatarValor(v.valorCredito)}
    `;
  }

  if (v.pagamento === "Dinheiro/Débito") {
    return `
      Dinheiro: ${formatarValor(v.valorDinheiro)}<br>
      Débito: ${formatarValor(v.valorDebito)}
    `;
  }

  return v.pagamento || "-";
}

/* ENCERRAR ESTACIONAMENTO */
function solicitarFormaPagamento(valorTotal) {
  const ehAdmin = localStorage.getItem("nivel") === "admin";
  let mensagem =
    "Escolha a forma de pagamento:\n" +
    "1 - Dinheiro\n" +
    "2 - Pix\n" +
    "3 - Débito\n" +
    "4 - Crédito\n" +
    "5 - Dinheiro / Crédito\n" +
    "6 - Dinheiro / Débito\n\n" +
    "0 - Excluir atendimento"
  ;

  

  const opcao = prompt(mensagem);

  if (opcao === null) {
    return { cancelado: true };
  }

  if (opcao === "0") {
    if (!ehAdmin) {
      alert("Você não possui permissão para excluir atendimentos.");
      return { cancelado: true };
    }

    return { excluir: true };
  }

  if (opcao === "1") {
    return {
      pagamento: "Dinheiro"
    };
  }

  if (opcao === "2") {
    return {
      pagamento: "Pix"
    };
  }

  if (opcao === "3") {
    return {
      pagamento: "Débito"
    };
  }

  if (opcao === "4") {
    return {
      pagamento: "Crédito"
    };
  }

  if (opcao === "5" || opcao === "6") {
    const valorDinheiroDigitado = prompt(
      `Total do atendimento: ${formatarValor(valorTotal)}\n\n` +
      "Informe o valor pago em dinheiro:"
    );

    if (valorDinheiroDigitado === null) {
      return { cancelado: true };
    }

    const valorDinheiro = Number(
      valorDinheiroDigitado
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );

    if (
      !Number.isFinite(valorDinheiro) ||
      valorDinheiro <= 0 ||
      valorDinheiro >= valorTotal
    ) {
      alert(
        "O valor em dinheiro precisa ser maior que zero e menor que o total."
      );

      return { cancelado: true };
    }

    const valorRestante = Number(
      (valorTotal - valorDinheiro).toFixed(2)
    );

    if (opcao === "5") {
      return {
        pagamento: "Dinheiro/Crédito",
        valorDinheiro,
        valorCredito: valorRestante
      };
    }

    return {
      pagamento: "Dinheiro/Débito",
      valorDinheiro,
      valorDebito: valorRestante
    };
  }

  alert("Opção de pagamento inválida.");

  return { cancelado: true };
}

async function encerrarEstacionamento(id) {
  const v = estacionados.find(i => i.id === id);

  if (!v) {
    alert("Atendimento não encontrado.");
    return;
  }

  const saida = new Date();

  const usaValorFixo =
    v.tipoEntrada === "Mensal" ||
    v.tipoEntrada === "Diária";

  let valor;

  if (usaValorFixo) {
    valor = Number(v.valor || 0);
  } else {
    valor = calcularEstacionamento(
      v.entrada,
      saida,
      v.tipoEstacionamento
    );
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    alert("O atendimento não possui um valor válido.");
    return;
  }

  const resultadoPagamento =
    solicitarFormaPagamento(valor);

  if (resultadoPagamento.cancelado) {
    return;
  }

  if (resultadoPagamento.excluir) {
    const confirmarExclusao = confirm(
      "Tem certeza que deseja excluir este atendimento? " +
      "Ele não será contabilizado no caixa."
    );

    if (!confirmarExclusao) {
      return;
    }

    await db
      .collection("atendimentos")
      .doc(id)
      .delete();

    estacionados = estacionados.filter(
      item => item.id !== id
    );

    atualizarListaEstacionamento();

    alert("Atendimento excluído com sucesso!");
    return;
  }

  atendimentoPendente = {
    id,
    tipo: v.tipoEntrada,
    veiculo: v,
    saida,
    valor,
    dadosPagamento: resultadoPagamento
  };

  Object.assign(v, resultadoPagamento);

  if (usaValorFixo) {
    gerarCupomValorFixoFinal(v, saida, valor);
  } else {
    gerarCupomSaida(v, saida, valor);
  }
}

/* FINALIZAR LAVAGEM */
async function finalizarLavagem(id) {
  const v = estacionados.find(i => i.id === id);

  if (!v) {
    alert("Atendimento não encontrado.");
    return;
  }

  const valor = Number(v.valor || 0);

  const resultadoPagamento = solicitarFormaPagamento(valor);

  if (resultadoPagamento.cancelado) {
    return;
  }

  if (resultadoPagamento.excluir) {
    const confirmarExclusao = confirm(
      "Tem certeza que deseja excluir este atendimento? " +
      "Ele não será contabilizado no caixa."
    );

    if (!confirmarExclusao) return;

    await db.collection("atendimentos").doc(id).delete();

    estacionados = estacionados.filter(item => item.id !== id);
    atualizarListaEstacionamento();

    alert("Atendimento excluído com sucesso!");
    return;
  }

  atendimentoPendente = {
    id,
    tipo: "Lavagem",
    veiculo: v,
    saida: new Date(),
    valor,
    dadosPagamento: resultadoPagamento
  };

  Object.assign(v, resultadoPagamento);

  gerarCupomLavagemFinal(v);
}

/* CUPONS */
function gerarCupomEstacionamento(v) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Entrada estacionamento</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Placa:</strong> ${v.placa}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p><strong>Entrada:</strong> ${formatarData(v.entrada)} às ${formatarHora(v.entrada)}</p>
    <p><strong>Status:</strong> Aberto</p>
  `;
}

function gerarCupomSaida(v, s, val) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Total:</strong> ${formatarValor(val)}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p>
  <strong>Pagamento:</strong><br>
  ${mostrarPagamentoComanda(v)}
</p>
    <p><strong>Entrada:</strong> ${formatarHora(v.entrada)}</p>
    <p><strong>Saída:</strong> ${formatarData(s)} ${formatarHora(s)}</p>
  `;
}

function gerarCupomLavagem(d) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Lavagem</p>
    <p><strong>Cliente:</strong> ${d.nome}</p>
    <p><strong>Veículo:</strong> ${d.veiculo}</p>
    <p><strong>Placa:</strong> ${d.placa}</p>
    <p><strong>Tipo do veículo:</strong> ${d.tipoVeiculo}</p>
    <p><strong>Serviço:</strong> ${d.servico}</p>
    <p><strong>Cera:</strong> ${d.cera ? "Sim (+R$10)" : "Não"}</p>
    <p><strong>Data:</strong> ${formatarData(d.data)}</p>
    <p><strong>Serviço Adicional:</strong> ${d.servicoadicional || "Nenhum"}</p>
    <p><strong>Valor Adicional:</strong> ${d.precoAdicional ? formatarValor(d.precoAdicional) : "Nenhum"}</p>
    <p><strong>Horário:</strong> ${formatarHora(d.data)}</p>
    <hr>
    <p><strong>Total:</strong> ${formatarValor(d.valor)}</p>
  `;
}

function gerarCupomValorFixo(d) {
  coupon.classList.remove("hidden");

  const nomeTipo = d.tipoEntrada === "Mensal"
    ? "Mensalista"
    : "Diária";

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> ${nomeTipo}</p>
    <p><strong>Cliente:</strong> ${d.nome}</p>
    <p><strong>Veículo:</strong> ${d.veiculo}</p>
    <p><strong>Placa:</strong> ${d.placa}</p>
    <p><strong>Telefone:</strong> ${d.telefone}</p>
    <p><strong>Serviço:</strong> ${d.servico}</p>
    <p><strong>Data:</strong> ${formatarData(d.data)}</p>
    <hr>
    <p><strong>Total:</strong> ${formatarValor(d.valor)}</p>
  `;
}

function gerarCupomLavagemFinal(v) {
  const agora = new Date();

  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Lavagem Finalizada</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Placa:</strong> ${v.placa}</p>
    <p><strong>Valor:</strong> ${formatarValor(v.valor)}</p>
    <p><strong>Data:</strong> ${formatarData(agora)}</p>
    <p><strong>Horário Entrada:</strong> ${formatarHora(v.entrada)}</p>
    <p>
  <strong>Pagamento:</strong><br>
  ${mostrarPagamentoComanda(v)}
</p>
    <p><strong>Horário Saída:</strong> ${formatarHora(agora)}</p>
  `;
}

function gerarCupomValorFixoFinal(v, saida, valor) {
  coupon.classList.remove("hidden");

  const nomeTipo =
    v.tipoEntrada === "Mensal"
      ? "Mensalidade"
      : "Diária";

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> ${nomeTipo}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Placa:</strong> ${v.placa}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p><strong>Serviço:</strong> ${v.servico}</p>

    <p>
      <strong>Pagamento:</strong><br>
      ${mostrarPagamentoComanda(v)}
    </p>

    <p>
      <strong>Data:</strong>
      ${formatarData(saida)}
    </p>

    <p>
      <strong>Horário:</strong>
      ${formatarHora(saida)}
    </p>

    <hr>

    <p>
      <strong>Total:</strong>
      ${formatarValor(valor)}
    </p>
  `;
}

/* EDITAR PELA URL */
async function verificarEdicaoPelaURL() {
  const params = new URLSearchParams(window.location.search);
  const idEditar = params.get("editar");

  if (!idEditar) return;

  const doc = await db.collection("atendimentos").doc(idEditar).get();

  if (!doc.exists) {
    alert("Atendimento não encontrado para edição.");
    return;
  }

  const d = doc.data();

  const atendimento = {
    id: doc.id,
    nome: d.nome,
    veiculo: d.veiculo,
    placa: d.placa,
    telefone: d.telefone,
    entrada: d.entrada?.toDate ? d.entrada.toDate() : new Date(d.entrada),
    status: d.status,
    tipoEntrada: d.tipoEntrada,
    servico: d.servico || null,
    servicoadicional: d.servicoadicional || null,
    precoAdicional: d.precoAdicional || null,
    tipoEstacionamento: d.tipoEstacionamento || null,
    tipoVeiculo: d.tipoVeiculo || null,
    pagamento: d.pagamento || null,
    cera: d.cera || false,
    valor: d.valor || null,
  };

  estacionados.push(atendimento);

  setTimeout(() => {
    abrirEdicao(idEditar);
  }, 300);
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  if (listaEstacionamento) {
    carregarEstacionamentosAbertos();
  }

  if (vehicleForm) {
    verificarEdicaoPelaURL();
  }
});

/* LOGOUT */
function logout() {
  firebase.auth().signOut().then(() => window.location.href = "index.html");
}


function aplicarPermissoes() {
  const nivel = localStorage.getItem("nivel");

  if (nivel === "lava") {
    const menusBloqueados = [
      "Caixa",
      "Histórico",
      "Financeiro",
      "Veículos Estacionados",
    ];

    document.querySelectorAll("nav a").forEach((link) => {
      const texto = link.textContent.trim();

      if (menusBloqueados.includes(texto)) {
        link.style.display = "none";
      }
    });
  }
}

aplicarPermissoes();

async function buscarClientePorPlaca() {
  const placa = document.getElementById("placa").value.trim().toUpperCase();

  if (!placa) return;

  const doc = await db.collection("clientes").doc(placa).get();

  if (!doc.exists) return;

  const cliente = doc.data();

  document.getElementById("nome").value = cliente.nome || "";
  document.getElementById("veiculo").value = cliente.veiculo || "";
  document.getElementById("telefone").value = cliente.telefone || "";
}

/* CONFIRMAR FECHAMENTO */
async function confirmarFechamentoAtendimento() {
  if (!atendimentoPendente) {
    alert("Nenhum atendimento pendente para finalizar.");
    return;
  }

  const {
    id,
    tipo,
    saida,
    valor,
    dadosPagamento
  } = atendimentoPendente;

  const dadosFinalizacao = {
    status: "Finalizado",
    valor,
    ...dadosPagamento
  };

  if (
  tipo === "Estacionamento" ||
  tipo === "Mensal" ||
  tipo === "Diária"
) {
  dadosFinalizacao.saida = saida;
  dadosFinalizacao.finalizadoEm = saida;
}

if (tipo === "Lavagem") {
  dadosFinalizacao.finalizadoEm = saida;
}

  await db
    .collection("atendimentos")
    .doc(id)
    .update(dadosFinalizacao);

  estacionados = estacionados.filter(item => item.id !== id);
  atualizarListaEstacionamento();

  atendimentoPendente = null;
  fecharCupom();

  alert("Atendimento finalizado com sucesso!");
}