const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const systemScreen = document.getElementById("systemScreen");
const logoutBtn = document.getElementById("logoutBtn");
const parkingOptions = document.getElementById("parkingOptions");
const vehicleForm = document.getElementById("vehicleForm");
const washOptions = document.getElementById("washOptions");
const tipoEntradaInputs = document.querySelectorAll("input[name='tipoEntrada']");
const listaEstacionamento = document.getElementById("listaEstacionamento");
const coupon = document.getElementById("coupon");
const cupomConteudo = document.getElementById("cupomConteudo");

let estacionados = [];
let editId = null; // ✏️ Variável global para controlar se estamos editando um cadastro

/* CONTROLE DE EXIBIÇÃO: LAVAGEM VS ESTACIONAMENTO */
tipoEntradaInputs.forEach((input) => {
  input.addEventListener("change", function () {
    washOptions.classList.toggle("hidden", this.value !== "Lavagem");
    parkingOptions.classList.toggle("hidden", this.value !== "Estacionamento");
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

  if (cera === true ||  cera === "true"){
    valor += 10;
  }

  return valor;
}

/* PREÇO ESTACIONAMENTO */
function calcularEstacionamento(entrada, saida, tipoEstacionamento = "Carro Comum") {
  const diffHoras = (saida - entrada) / (1000 * 60 * 60);
  
  let valorPrimeiraHora = 10;
  let valorHoraAdicional = 3;

  // 🌟 Tratamento para evitar problemas com espaços ou letras maiúsculas/minúsculas
  const tipo = tipoEstacionamento ? tipoEstacionamento.trim() : "Carro Comum";

  if (tipo === "Moto") {
    valorPrimeiraHora = 8;
    valorHoraAdicional = 4;
  } else if (tipo === "Carro Grande") {
    valorPrimeiraHora = 10;
    valorHoraAdicional = 5; // 🌟 R$ 5,00 por hora adicional para Carros Grandes
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
          servico: d.servico || null,
          servicoadicional: d.servicoadicional || null,
          precoAdicional: d.precoAdicional || null,
          tipoEstacionamento: d.tipoEstacionamento || null,
          tipoVeiculo: d.tipoVeiculo || null, // 🌟 Adicionado para permitir edição
          pagamento: d.pagamento || null,         // 🌟 Adicionado para permitir edição
          cera: d.cera || false,               // 🌟 Corrigido o mapeamento do seu banco
          valor: d.valor || null
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
    
    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Cria o objeto base com as informações em comum
    let dadosAtendimento = { nome, veiculo, placa, telefone, tipoEntrada };

   /* CONFIGURAÇÃO ESPECÍFICA PARA ESTACIONAMENTO */
    if (tipoEntrada === "Estacionamento") {
      const tipoEstacionamento = document.querySelector("input[name='tipoEstacionamento']:checked")?.value;
      
      // 🌟 CORREÇÃO: Garante que a categoria (Carro Grande / Comum / Moto) seja salva
      dadosAtendimento.tipoEstacionamento = tipoEstacionamento || "Carro Comum";
      
      // Só insere dados de abertura/data se for um NOVO cadastro
      if (!editId) {
        dadosAtendimento.status = "Aberto";
        dadosAtendimento.entrada = agora;
        dadosAtendimento.criadoEm = agora;
        dadosAtendimento.data = hoje;
        dadosAtendimento.hora = hora;
        dadosAtendimento.statusCaixa = "aberto";
      }
    }

    /* CONFIGURAÇÃO ESPECÍFICA PARA LAVAGEM */
    if (tipoEntrada === "Lavagem") {
      const tipoVeiculo = document.querySelector("input[name='tipoVeiculo']:checked")?.value;
      const servico = document.getElementById("servico").value;
      
      // 🌟 CORREÇÃO: Força a captura do valor booleano (true/false) do checkbox da cera
      const ceraCheckbox = document.getElementById("cera");
      const temCera = ceraCheckbox ? ceraCheckbox.checked : false;
      
      const pagamento = document.getElementById("pagamento").value;
      const servicoadicional = document.getElementById("servicoad").value;
      const precoAdicional = document.getElementById("precoAd").value;

      if (!tipoVeiculo) return alert("Selecione o tipo de veículo.");
      if (tipoVeiculo !== "Moto" && !servico) return alert("Selecione o serviço.");
      if (!pagamento) return alert("Selecione a forma de pagamento.");

      // Calcula o valor aplicando as correções de tipo de veículo e cera booleana
      const valor = calcularLavagem(tipoVeiculo, servico, temCera) + (precoAdicional ? parseFloat(precoAdicional) : 0);

      dadosAtendimento = {
        ...dadosAtendimento,
        tipoVeiculo,
        servico,
        cera: temCera, // Grava como true/false legítimo no Firestore
        valor,
        pagamento,
        servicoadicional,
        precoAdicional
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

    /* SALVAMENTO NO FIREBASE (DECIDE SE ATUALIZA OU CRIA NOVO) */
    if (editId) {
      // Modo Edição: Atualiza o documento existente
      await db.collection("atendimentos").doc(editId).update(dadosAtendimento);
      alert("Cadastro atualizado com sucesso!");
      editId = null; // Reseta o estado de edição
      
      const btnSubmit = vehicleForm.querySelector("button[type='submit']");
      if (btnSubmit) btnSubmit.textContent = "Cadastrar"; 
    } else {
      // Modo Cadastro: Cria um novo documento
      const docRef = await db.collection("atendimentos").add(dadosAtendimento);
      
      // Geração de cupons iniciais apenas para novos cadastros
      if (tipoEntrada === "Estacionamento") {
        gerarCupomEntrada({ id: docRef.id, ...dadosAtendimento, entrada: agora });
      } else {
        gerarCupomLavagem({ ...dadosAtendimento, data: agora });
      }
    }

    vehicleForm.reset();
    washOptions.classList.add("hidden");
    parkingOptions.classList.add("hidden");
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
        <button onclick="verCupom('${v.id}')" title="Ver Cupom">🧾</button>
        <button onclick="abrirEdicao('${v.id}')" title="Editar">✏</button>
        ${
          v.tipoEntrada === "Estacionamento"
            ? `<button onclick="encerrarEstacionamento('${v.id}')" title="Finalizar">✔</button>`
            : `<button onclick="finalizarLavagem('${v.id}')" title="Finalizar">✔</button>`
        }
      </span>
    `;

    listaEstacionamento.appendChild(row);
  });
}

/* FUNÇÃO PARA DETERMINAR E PREENCHER OS CAMPOS EM MODO EDIÇÃO */
function abrirEdicao(id) {
  const v = estacionados.find(i => i.id === id);
  if (!v) return alert("Registro não encontrado");

  editId = id; // Define o ID que estamos editando

  // 1. Preenche os campos principais
  document.getElementById("nome").value = v.nome || "";
  document.getElementById("veiculo").value = v.veiculo || "";
  document.getElementById("placa").value = v.placa || "";
  document.getElementById("telefone").value = v.telefone || "";

  // 2. Seleciona e ativa visualmente a categoria correta (Lavagem ou Estacionamento)
  const inputTipoEntrada = document.querySelector(`input[name='tipoEntrada'][value='${v.tipoEntrada}']`);
  if (inputTipoEntrada) {
    inputTipoEntrada.checked = true;
    washOptions.classList.toggle("hidden", v.tipoEntrada !== "Lavagem");
    parkingOptions.classList.toggle("hidden", v.tipoEntrada !== "Estacionamento");
  }

  // 3. Preenche as sub-opções dependendo da categoria
  if (v.tipoEntrada === "Estacionamento") {
    const inputTipoEst = document.querySelector(`input[name='tipoEstacionamento'][value='${v.tipoEstacionamento}']`);
    if (inputTipoEst) inputTipoEst.checked = true;
  } 
  
  if (v.tipoEntrada === "Lavagem") {
    const inputTipoVeic = document.querySelector(`input[name='tipoVeiculo'][value='${v.tipoVeiculo}']`);
    if (inputTipoVeic) inputTipoVeic.checked = true;

    document.getElementById("servico").value = v.servico || "";
    document.getElementById("pagamento").value = v.pagamento || "";
    document.getElementById("servicoad").value = v.servicoadicional || "";
    document.getElementById("precoAd").value = v.precoAdicional || "";
    
    // 🌟 CORREÇÃO: Garante o sincronismo visual do Checkbox ao carregar dados salvos
    const inputCera = document.getElementById("cera");
    if (inputCera) {
      inputCera.checked = (v.cera === true || v.cera === "true");
    }
  }
  

  // 4. Modifica temporariamente o texto do botão para avisar que é uma alteração
  const btnSubmit = vehicleForm.querySelector("button[type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Salvar Alterações";

  // Rola a tela até o formulário de forma suave
  vehicleForm.scrollIntoView({ behavior: "smooth" });
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

/* ENCERRAR ESTACIONAMENTO */
async function encerrarEstacionamento(id) {
  const v = estacionados.find(i => i.id === id);
  const saida = new Date();
  const valor = calcularEstacionamento(v.entrada, saida, v.tipoEstacionamento);

  let opcao = prompt(
    "Escolha a forma de pagamento:\n1 - Dinheiro\n2 - Pix\n3 - Débito\n4 - Crédito"
  );

  let pagamento = "Dinheiro";
  if (opcao === "2") pagamento = "Pix";
  if (opcao === "3") pagamento = "Débito";
  if (opcao === "4") pagamento = "Crédito";

  await db.collection("atendimentos").doc(id).update({
    status: "Finalizado",
    saida: saida,
    valor: valor,
    pagamento: pagamento 
  });

  v.pagamento = pagamento;
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
function generarCupomEntrada(v) {
  coupon.classList.remove("hidden");
  cupomConteudo.innerHTML = `<p>Entrada registrada - ${v.placa}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
  `;
}

function gerarCupomSaida(v, s, val) {
  coupon.classList.remove("hidden");
  cupomConteudo.innerHTML = `<p>Total: ${formatarValor(val)}</p>
    <p><strong>Cliente:</strong> ${v.nome}</p>
    <p><strong>Veículo:</strong> ${v.veiculo}</p>
    <p><strong>Telefone:</strong> ${v.telefone}</p>
    <p><strong>Pagamento:</strong> ${v.pagamento}</p>
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
    <p><strong>Valor:</strong> ${formatarValor(v.valor)}</p>
    <p><strong>Data:</strong> ${formatarData(agora)}</p>
    <p><strong>Horário Entrada:</strong> ${formatarHora(v.entrada)}</p>
    <p><strong>Horário Saída:</strong> ${formatarHora(agora)}</p>
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