function onChangeEmail() {
    toggleButtonsDisable();
    toggleEmailErrors();
}

function onChangePassword() {
    toggleButtonsDisable();
    togglePasswordErrors();
}

function login() {
    firebase.auth().signInWithEmailAndPassword(
        form.email().value,
        form.password().value
    ).then(response => {

        const email = response.user.email;

        if (email === "pitstop@hotmail.com") {
            localStorage.setItem("nivel", "lava");
        } else if (email === "viniciuspitstop@hotmail.com") {
            localStorage.setItem("nivel", "admin");
        } else {
            localStorage.setItem("nivel", "lava");
        }

        window.location.href = "dashboard.html";

    }).catch(error => {
        alert(getErrorMessage(error));
    });
}

function getErrorMessage(error) {
    if (error.code == "auth/user-not-found") {
        return "Usuário não encontrado";
    }

    if (error.code == "auth/wrong-password") {
        return "Senha incorreta";
    }

    if (error.code == "auth/invalid-credential") {
        return "Email ou senha inválidos";
    }

    return error.message;
}

function toggleEmailErrors() {
    const email = form.email().value;
    form.emailRequiredError().style.display = email ? "none" : "block";
    form.emailInvalidError().style.display = validateEmail(email) ? "none" : "block";
}

function togglePasswordErrors() {
    const password = form.password().value;
    form.passwordRequiredError().style.display = password ? "none" : "block";
}

function toggleButtonsDisable() {
    form.loginButton().disabled = !isEmailValid() || !isPasswordValid();
}

function isEmailValid() {
    const email = form.email().value;

    if (!email) {
        return false;
    }

    return validateEmail(email);
}

function isPasswordValid() {
    return form.password().value ? true : false;
}

const form = {
    email: () => document.getElementById("email"),

    emailRequiredError: () =>
        document.getElementById("email-required-error"),

    emailInvalidError: () =>
        document.getElementById("email-invalid-error"),

    loginButton: () =>
        document.getElementById("login-button"),

    password: () =>
        document.getElementById("password"),

    passwordRequiredError: () =>
        document.getElementById("password-required-error"),
};