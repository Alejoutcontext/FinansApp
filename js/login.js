document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("loginForm");
  const message = document.getElementById("message");
  const button = document.getElementById("loginBtn");
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  // Mostrar / ocultar contraseña
  togglePassword.addEventListener("click", function () {
    passwordInput.type =
      passwordInput.type === "password" ? "text" : "password";
  });

  // Evento submit
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value.trim();

    message.textContent = "";
    message.className = "message";

    if (!email || !password) {
      message.textContent = "Completa todos los campos.";
      message.classList.add("error");
      return;
    }

    button.disabled = true;
    button.textContent = "Cargando...";

    setTimeout(() => {

      if (email === "test@test.com" && password === "1234") {

        message.textContent = "Bienvenido. Redirigiendo...";
        message.classList.add("success");

        // 🔥 REDIRECCIÓN AQUÍ
        setTimeout(() => {
          window.location.href = "/FinansApp/dashboard.html";
        }, 800);

      } else {

        message.textContent = "Correo o contraseña incorrectos.";
        message.classList.add("error");
        button.disabled = false;
        button.textContent = "Iniciar sesión";

      }

    }, 800);

  });

});
