const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const systemScreen = document.getElementById("systemScreen");
const logoutBtn = document.getElementById("logoutBtn");

const vehicleForm = document.getElementById("vehicleForm");
const washOptions = document.getElementById("washOptions");
const tipoEntradaInputs = document.querySelectorAll("input[name='tipoEntrada']");
const listaEstacionamento = document.getElementById("listaEstacionamento");
const coupon = document.getElementById("coupon");
const cupomConteudo = document.getElementById("cupomConteudo");

let estacionados = [];

/* LOGIN */
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  loginScreen.classList.add("hidden");
  systemScreen.classList.remove("hidden");
  carregarEstacionamentosAbertos();
});

logoutBtn.addEventListener("click", function () {
  systemScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

/* MOSTRAR LAVAGEM */
tipoEntradaInputs.forEach((input) => {
  input.addEventListener("change", function () {
    if (this.value === "Lavagem") {
      washOptions.classList.remove("hidden");
    } else {
      washOptions.classList.add("hidden");
    }
  });
});

/* PREÇO LAVAGEM */
function calcularLavagem(tipoVeiculo, servico, cera) {
  let valor = 0;

  if (tipoVeiculo === "Moto") {
    valor = 45;
  } else {
    if (servico === "Lavagem completa") {
      if (tipoVeiculo === "Hatch") valor = 45;
      if (tipoVeiculo === "Sedan") valor = 50;
      if (tipoVeiculo === "SUV") valor = 60;
    }

    if (servico === "Lavagem rápida") valor = 20;
    if (servico === "Ducha com secagem") valor = 30;
  }

  if (cera) valor += 10;

  return valor;
}

/* PREÇO ESTACIONAMENTO */
function calcularEstacionamento(entrada, saida) {
  const diffMs = saida - entrada;
  const diffHoras = diffMs / (1000 * 60 * 60);

  if (diffHoras <= 1) return 10;

  const horasAdicionais = Math.ceil(diffHoras - 1);
  return 10 + horasAdicionais * 3;
}

/* FORMATAR */
function formatarData(data) {
  return data.toLocaleDateString("pt-BR");
}

function formatarHora(data) {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarValor(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* CARREGAR ESTACIONAMENTOS ABERTOS */
async function carregarEstacionamentosAbertos() {
  const snapshot = await db
    .collection("atendimentos")
    .where("tipoEntrada", "==", "Estacionamento")
    .where("status", "==", "Aberto")
    .get();

  estacionados = [];

  snapshot.forEach((doc) => {
    const dados = doc.data();

    estacionados.push({
      id: doc.id,
      veiculo: dados.veiculo,
      placa: dados.placa,
      telefone: dados.telefone,
      entrada: dados.entrada.toDate(),
      status: dados.status,
    });
  });

  atualizarListaEstacionamento();
  atualizarTempos();
}

/* CADASTRAR */
vehicleForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const veiculo = document.getElementById("veiculo").value;
  const placa = document.getElementById("placa").value.toUpperCase();
  const telefone = document.getElementById("telefone").value;
  const tipoEntrada = document.querySelector("input[name='tipoEntrada']:checked").value;

  const agora = new Date();

  if (tipoEntrada === "Estacionamento") {
    const docRef = await db.collection("atendimentos").add({
      nome,
      veiculo,
      placa,
      telefone,
      tipoEntrada: "Estacionamento",
      status: "Aberto",
      entrada: agora,
      criadoEm: new Date(),
    });

    const veiculoObj = {
      id: docRef.id,
      nome,
      veiculo,
      placa,
      telefone,
      entrada: agora,
      status: "Aberto",
    };

    estacionados.push(veiculoObj);
    atualizarListaEstacionamento();
    gerarCupomEntradaEstacionamento(veiculoObj);
  }

  if (tipoEntrada === "Lavagem") {
    const tipoVeiculoSelecionado = document.querySelector("input[name='tipoVeiculo']:checked");
    const servico = document.getElementById("servico").value;
    const cera = document.getElementById("cera").checked;

    if (!tipoVeiculoSelecionado) {
      alert("Selecione o tipo de veículo.");
      return;
    }

    if (tipoVeiculoSelecionado.value !== "Moto" && !servico) {
      alert("Selecione o serviço.");
      return;
    }

    const tipoVeiculo = tipoVeiculoSelecionado.value;
    const servicoFinal = tipoVeiculo === "Moto" ? "Lavagem de moto" : servico;
    const valor = calcularLavagem(tipoVeiculo, servico, cera);

    const dadosLavagem = {
      nome,
      veiculo,
      placa,
      telefone,
      tipoEntrada: "Lavagem",
      tipoVeiculo,
      servico: servicoFinal,
      cera,
      valor,
      status: "Finalizado",
      entrada: agora,
      criadoEm: new Date(),
    };

    await db.collection("atendimentos").add(dadosLavagem);

    gerarCupomLavagem({
      nome,
      veiculo,
      placa,
      telefone,
      tipoVeiculo,
      servico: servicoFinal,
      cera,
      valor,
      data: agora,
    });
  }

  vehicleForm.reset();
  washOptions.classList.add("hidden");
});

/* LISTA ESTACIONADOS */
function atualizarListaEstacionamento() {
  listaEstacionamento.innerHTML = "";

  estacionados.forEach((veiculo) => {
    const item = document.createElement("div");
    item.className = "parking-card";

    item.innerHTML = `
      <strong>${veiculo.placa}</strong>
      <span>${veiculo.nome}</span>
      <div class="status">Em aberto</div>
      <small id="tempo-${veiculo.id}">Calculando...</small>
      <button onclick="encerrarEstacionamento('${veiculo.id}')">
        Encerrar atendimento
      </button>
    `;

    listaEstacionamento.appendChild(item);
  });
}

/* ENCERRAR ESTACIONAMENTO */
async function encerrarEstacionamento(id) {
  const veiculo = estacionados.find((item) => item.id === id);

  if (!veiculo) {
    alert("Veículo não encontrado.");
    return;
  }

  const saida = new Date();
  const valor = calcularEstacionamento(veiculo.entrada, saida);

  await db.collection("atendimentos").doc(id).update({
    status: "Finalizado",
    saida,
    valor,
    finalizadoEm: new Date(),
  });

  gerarCupomSaidaEstacionamento(veiculo, saida, valor);

  estacionados = estacionados.filter((item) => item.id !== id);
  atualizarListaEstacionamento();
}

/* CUPOM ENTRADA */
function gerarCupomEntradaEstacionamento(veiculo) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Entrada estacionamento</p>
    <p><strong>Veiculo:</strong> ${veiculo.veiculo}</p>
    <p><strong>Cliente:</strong> ${veiculo.nome}</p>
    <p><strong>Placa:</strong> ${veiculo.placa}</p>
    <p><strong>Telefone:</strong> ${veiculo.telefone}</p>
    <p><strong>Data:</strong> ${formatarData(veiculo.entrada)}</p>
    <p><strong>Horário de entrada:</strong> ${formatarHora(veiculo.entrada)}</p>
    <p><strong>Status:</strong> Aberto</p>
  `;
}

/* CUPOM SAÍDA */
function gerarCupomSaidaEstacionamento(veiculo, saida, valor) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Encerramento estacionamento</p>
    <p><strong>Veículo:</strong> ${veiculo.veiculo}</p>
    <p><strong>Cliente:</strong> ${veiculo.nome}</p>
    <p><strong>Placa:</strong> ${veiculo.placa}</p>
    <p><strong>Telefone:</strong> ${veiculo.telefone}</p>
    <p><strong>Entrada:</strong> ${formatarData(veiculo.entrada)} às ${formatarHora(veiculo.entrada)}</p>
    <p><strong>Saída:</strong> ${formatarData(saida)} às ${formatarHora(saida)}</p>
    <p><strong>TOTAL</strong> ${formatarValor(valor)}</p>
  `;
}

/* CUPOM LAVAGEM */
function gerarCupomLavagem(dados) {
  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> Lava rápido</p>
    <p><strong>Veiculo:</strong> ${dados.veiculo}</p>
    <p><strong>Cliente:</strong> ${dados.nome}</p>
    <p><strong>Placa:</strong> ${dados.placa}</p>
    <p><strong>Telefone:</strong> ${dados.telefone}</p>
    <p><strong>Veículo:</strong> ${dados.tipoVeiculo}</p>
    <p><strong>Serviço:</strong> ${dados.servico}</p>
    <p><strong>Cera:</strong> ${dados.cera ? "Sim (+R$10,00)" : "Não"}</p>
    <p><strong>Data:</strong> ${formatarData(dados.data)}</p>
    <p><strong>Horário:</strong> ${formatarHora(dados.data)}</p>
    <p><strong>TOTAL</strong> ${formatarValor(dados.valor)}</p>
  `;
}

/* TEMPO AO VIVO */
function atualizarTempos() {
  estacionados.forEach((veiculo) => {
    const agora = new Date();
    const diffMs = agora - veiculo.entrada;

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    const texto = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;

    const el = document.getElementById(`tempo-${veiculo.id}`);
    if (el) {
      el.textContent = `Estacionado há: ${texto}`;
    }
  });
}

setInterval(atualizarTempos, 60000);

function irParaCaixa() {
  window.location.href = "caixa.html";
}

  function irParaUsuarios() {
  window.location.href = "usuario.html";
}