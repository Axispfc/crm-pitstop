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

/* MOSTRAR LAVAGEM */
tipoEntradaInputs.forEach((input) => {
  input.addEventListener("change", function () {
    washOptions.classList.toggle("hidden", this.value !== "Lavagem");
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
  const diffHoras = (saida - entrada) / (1000 * 60 * 60);
  if (diffHoras <= 1) return 10;
  return 10 + Math.ceil(diffHoras - 1) * 3;
}

/* FORMATADORES */
const formatarData = (d) => d.toLocaleDateString("pt-BR");
const formatarHora = (d) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const formatarValor = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
          entrada: d.entrada.toDate(),
          status: d.status,
          tipoEntrada: d.tipoEntrada,
          // 👇 ADICIONE ISSO
          servico: d.servico,
          
          cera: d.cera || false,
          valor: d.valor || null
        });
      });

      atualizarListaEstacionamento();
    });
}

/* CADASTRO */
if (vehicleForm) {
  vehicleForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const veiculo = document.getElementById("veiculo").value;
    const placa = document.getElementById("placa").value.toUpperCase();
    const telefone = document.getElementById("telefone").value;
    const tipoEntrada = document.querySelector("input[name='tipoEntrada']:checked").value;

   const agora = new Date();

// 🔥 ADICIONE ISSO
const hoje = agora.toISOString().split("T")[0];
const hora = agora.toLocaleTimeString("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});

    /* ESTACIONAMENTO */
    if (tipoEntrada === "Estacionamento") {
      const docRef = await db.collection("atendimentos").add({
  nome,
  veiculo,
  placa,
  telefone,
  tipoEntrada,
  status: "Aberto",
  entrada: agora,
  criadoEm: agora,

  // 🔥 ADICIONAR
  data: hoje,
  hora: hora,

   statusCaixa: "aberto" // 👈 ADICIONE ISSO
});

      const obj = { id: docRef.id, nome, veiculo, placa, telefone, entrada: agora, status: "Aberto", tipoEntrada };

      
      gerarCupomEntrada(obj);
    }

    /* LAVAGEM */
    if (tipoEntrada === "Lavagem") {
      const tipoVeiculo = document.querySelector("input[name='tipoVeiculo']:checked")?.value;
      const servico = document.getElementById("servico").value;
      const cera = document.getElementById("cera")?.checked || false;
      const pagamento = document.getElementById("pagamento").value;

      if (!tipoVeiculo) return alert("Selecione o tipo de veículo.");
      if (tipoVeiculo !== "Moto" && !servico) return alert("Selecione o serviço.");
      if (!pagamento) { alert("Selecione a forma de pagamento.");
                       return;
                      }

      const valor = calcularLavagem(tipoVeiculo, servico, cera);

      const docRef = await db.collection("atendimentos").add({
  nome,
  veiculo,
  placa,
  telefone,
  tipoEntrada,
  tipoVeiculo,
  servico,
  cera,
  valor,
  pagamento,
  status: "Aberto",
  entrada: agora,
  criadoEm: agora,

  // 🔥 ADICIONAR
  data: hoje,
  hora: hora,

   statusCaixa: "aberto" // 👈 ADICIONE ISSO
});

      const obj = { id: docRef.id, nome, veiculo, placa, telefone, entrada: agora, status: "Aberto", tipoEntrada };

      
      
      gerarCupomLavagem({ nome, veiculo, placa, telefone, tipoVeiculo, servico, cera, valor, pagamento, data: agora });
    }

    vehicleForm.reset();
    washOptions.classList.add("hidden");
  });
}

/* LISTA */
function atualizarListaEstacionamento() {
  listaEstacionamento.innerHTML = "";

  estacionados.forEach((v) => {
    const tempo = v.tipoEntrada === "Estacionamento"
      ? (() => {
          const m = Math.floor((Date.now() - v.entrada) / 60000);
          return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
        })()
      : "-";

    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <span>${v.placa}</span>
      <span>${v.veiculo}</span>
      <span>${v.nome}</span>
      <span class="tipo ${v.tipoEntrada === 'Lavagem' ? 'lavagem' : 'estacionamento'}">${v.tipoEntrada}</span>
      <span>${tempo}</span>
      <span class="status aberto">${v.status}</span>
      <span class="actions">
        <button onclick="verCupom('${v.id}')">🧾</button>
        ${
          v.tipoEntrada === "Estacionamento"
            ? `<button onclick="encerrarEstacionamento('${v.id}')">✔</button>`
            : `<button onclick="finalizarLavagem('${v.id}')">✔</button>`
        }
      </span>
    `;

    listaEstacionamento.appendChild(row);
  });
}

/* CUPOM */
function verCupom(id) {
  const v = estacionados.find(i => i.id === id);
  if (!v) return alert("Não encontrado");

  coupon.classList.remove("hidden");

  cupomConteudo.innerHTML = `
    <p><strong>Tipo:</strong> ${v.tipoEntrada}</p>
    <p><strong>Serviços:</strong> ${v.servico}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p><strong>Placa:</strong> ${v.placa}</p>
    <p><strong>Entrada:</strong> ${formatarData(v.entrada)} ${formatarHora(v.entrada)}</p>

  `;
}

function fecharCupom() {
  coupon.classList.add("hidden");
}

/* ENCERRAR ESTACIONAMENTO */
async function encerrarEstacionamento(id) {
  const v = estacionados.find(i => i.id === id);
  const saida = new Date();
  const valor = calcularEstacionamento(v.entrada, saida);

  await db.collection("atendimentos").doc(id).update({
    status: "Finalizado",
    saida,
    valor,
  });

  gerarCupomSaida(v, saida, valor);
  estacionados = estacionados.filter(i => i.id !== id);
  atualizarListaEstacionamento();
}

/* FINALIZAR LAVAGEM */
async function finalizarLavagem(id) {
  const v = estacionados.find(i => i.id === id);

  await db.collection("atendimentos").doc(id).update({
    status: "Finalizado",
    finalizadoEm: new Date(),
  });

  gerarCupomLavagemFinal(v);
  estacionados = estacionados.filter(i => i.id !== id);
  atualizarListaEstacionamento();
}

/* CUPONS */
function gerarCupomEntrada(v) {
  coupon.classList.remove("hidden");
  cupomConteudo.innerHTML = `<p>Entrada registrada - ${v.placa}</p>`;
}

function gerarCupomSaida(v, s, val) {
  coupon.classList.remove("hidden");
  cupomConteudo.innerHTML = `<p>Total: ${formatarValor(val)}</p>`;
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
    <p><strong>Pagamento:</strong> ${d.pagamento}</p>
    <p><strong>Horário:</strong> ${formatarHora(d.data)}</p>
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
    <p><strong>Data:</strong> ${formatarData(agora)}</p>
    <p><strong>Horário:</strong> ${formatarHora(agora)}</p>
  `;
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  if (listaEstacionamento) carregarEstacionamentosAbertos();
});

/* LOGOUT */
function logout() {
  firebase.auth().signOut().then(() => window.location.href = "index.html");
}
