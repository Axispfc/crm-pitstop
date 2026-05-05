  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

   const firebaseConfig = {
    apiKey: "AIzaSyBBZ5ASFYLuFNB-sDQLZMIYqO5btdZGMGg",
    authDomain: "crm-pitstop.firebaseapp.com",
    projectId: "crm-pitstop",
    storageBucket: "crm-pitstop.firebasestorage.app",
    messagingSenderId: "216473066500",
    appId: "1:216473066500:web:f67c0541cb5a1bbe8edc41",
    measurementId: "G-9R569LYB6K"
  };

/* INICIALIZAR FIREBASE */
const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  
  

    const submit = document.getElementById('submit');
    submit.addEventListener("click", function (event) {
      event.preventDefault();

      /*LOGINS*/
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          alert("Creating account...")
          window.location.href = "dashboard.html";
          
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage)
    });
    });