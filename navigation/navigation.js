function irParaUsuarios() {
  window.location.href = "usuario.html";
}
function irParaCaixa() {
  window.location.href = "caixa.html";
}
function irParaVeiculos() {
  window.location.href = "veiculos.html";
}
function irParaDashboard() {
  window.location.href = "dashboard.html";
}   
function irParaHistorico() {
  window.location.href = "historico.html";
}
function irParaFinanceiro() {
  window.location.href = "financeiro.html";
}
document.addEventListener("DOMContentLoaded", () => {
  // Pega o nível de acesso guardado no momento do login
  const nivel = localStorage.getItem("nivel");

  // Pega o nome do arquivo atual (ex: "financeiro.html", "caixa.html")
  const paginaAtual = window.location.pathname.split("/").pop();

  /* 🚫 1. TRAVA DE SEGURANÇA VIA URL */
  if (nivel === "lava") {
    // Se o nível for 'lava', bloqueia o acesso direto a estas 3 páginas:
    if (
      paginaAtual === "caixa.html" || 
      paginaAtual === "financeiro.html" || 
      paginaAtual === "historico.html"
    ) {
      alert("Acesso Negado! Seu nível de usuário não permite acessar esta tela.");
      window.location.href = "dashboard.html"; // Redireciona para o Dashboard (que ele tem acesso)
      return;
    }
  }

  /* 🚫 2. ESCONDER OS BOTÕES DO MENU LATERAL */
  if (nivel === "lava") {
    // Seleciona QUALQUER link de navegação que esteja dentro de uma tag <nav> ou <aside>
    const linksMenu = document.querySelectorAll("aside nav a, .finance-sidebar nav a, nav a");
    
    linksMenu.forEach(link => {
      // Pega o texto do botão, remove espaços e deixa em minúsculo para comparar sem erro
      const textoBotao = link.textContent.trim().toLowerCase();
      
      // Se o texto for um dos três proibidos, remove ele visualmente da tela
      if (
        textoBotao === "caixa" || 
        textoBotao === "financeiro" || 
        textoBotao === "histórico" || 
        textoBotao === "historico"
      ) {
        link.style.display = "none";
      }
    });
  }
});