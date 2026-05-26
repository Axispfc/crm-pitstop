// 1. COLOQUE O OBJETO FORM AQUI NO TOPO DO ARQUIVO!
const form = {
    email: () => document.getElementById("email"),
    emailRequiredError: () => document.getElementById("email-required-error"),
    emailInvalidError: () => document.getElementById("email-invalid-error"),
    loginButton: () => document.getElementById("login-button"),
    password: () => document.getElementById("password"),
    passwordRequiredError: () => document.getElementById("password-required-error"),
};

/* CONTROLE DE SESSÃO AUTOMÁTICO */
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        definirNivelAcesso(user.email);
        window.location.href = "dashboard.html";
    }
});

/* FUNÇÃO AUXILIAR PARA DEFINIR O NÍVEL */
function definirNivelAcesso(email) {
    if (email === "pitstop@hotmail.com") {
        localStorage.setItem("nivel", "lava");
    } else if (email === "viniciuspitstop@hotmail.com") {
        localStorage.setItem("nivel", "admin");
    } else {
        localStorage.setItem("nivel", "atendente");
    }
}

function onChangeEmail() {
    toggleButtonsDisable();
    toggleEmailErrors();
}

function onChangePassword() {
    toggleButtonsDisable();
    togglePasswordErrors();
}

/* FUNÇÃO DE LOGIN */
function login() {
    firebase.auth().signInWithEmailAndPassword(
        form.email().value, form.password().value
    ).then(response => {
        const email = response.user.email;
        definirNivelAcesso(email);
        window.location.href = "dashboard.html";
    }).catch(error => {
        alert(getErrorMessage(error));
    });
}

function getErrorMessage(error) {
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        return "Usuário ou senha incorretos.";
    }
    return error.message;
}

function toggleEmailErrors() {
    const email = form.email().value;
    form.emailRequiredError().style.display = email ? "none" : "block";
    form.emailInvalidError().style.display = validateEmail(email) ? "none" : "block";
}

// ... mantenha o restante das funções (togglePasswordErrors, toggleButtonsDisable, etc.) abaixo daqui