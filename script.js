const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const systemScreen = document.getElementById("systemScreen");
const logoutBtn = document.getElementById("logoutBtn");

const vehicleForm = document.getElementById("vehicleForm");
const washOptions = document.getElementById("washOptions");
const tipoEntradaInputs = document.querySelectorAll("input[name='tipoEntrada']");
const printBtn = document.getElementById("printBtn");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  loginScreen.classList.add("hidden");
  systemScreen.classList.remove("hidden");
});

logoutBtn.addEventListener("click", function () {
  systemScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

tipoEntradaInputs.forEach((input) => {
  input.addEventListener("change", function () {
    if (this.value === "Lavagem") {
      washOptions.classList.remove("hidden");
    } else {
      washOptions.classList.add("hidden");
    }
  });
});

vehicleForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const placa = document.getElementById("placa").value;
  const telefone = document.getElementById("telefone").value;
  const tipoEntrada = document.querySelector("input[name='tipoEntrada']:checked").value;

  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("cupomNome").textContent = nome;
  document.getElementById("cupomPlaca").textContent = placa.toUpperCase();
  document.getElementById("cupomTelefone").textContent = telefone;
  document.getElementById("cupomTipo").textContent = tipoEntrada;
  document.getElementById("cupomData").textContent = data;
  document.getElementById("cupomHora").textContent = hora;

  document.getElementById("coupon").classList.remove("hidden");
});

printBtn.addEventListener("click", function () {
  window.print();
});
