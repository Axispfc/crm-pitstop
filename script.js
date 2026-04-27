const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  alert("Login realizado com sucesso!");

  window.location.href = "#dashboard";
});
