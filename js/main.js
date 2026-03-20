// ===============================
// LOGIN
// ===============================

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = loginForm.querySelector("input[type='email']").value.trim();
    const password = loginForm.querySelector("input[type='password']").value.trim();

    if (!email || !password) {
      alert("Por favor completa todos los campos.");
      return;
    }

    if (!validateEmail(email)) {
      alert("El correo electrónico no es válido.");
      return;
    }

    const button = loginForm.querySelector("button");
    button.textContent = "Cargando...";
    button.disabled = true;

    // Simulación de login
    setTimeout(() => {
      alert("Inicio de sesión exitoso 💚");
      button.textContent = "Iniciar sesión";
      button.disabled = false;

      // Aquí después redirigiremos al dashboard
      // window.location.href = "dashboard.html";

    }, 1200);
  });
}


// ===============================
// REGISTRO
// ===============================

const registerForm = document.querySelector("#registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = registerForm.querySelector("input[type='text']").value.trim();
    const email = registerForm.querySelector("input[type='email']").value.trim();
    const passwords = registerForm.querySelectorAll("input[type='password']");
    const password = passwords[0].value.trim();
    const confirmPassword = passwords[1].value.trim();

    if (!name || !email || !password || !confirmPassword) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    if (!validateEmail(email)) {
      alert("Correo electrónico inválido.");
      return;
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    const button = registerForm.querySelector("button");
    button.textContent = "Creando cuenta...";
    button.disabled = true;

    setTimeout(() => {
      alert("Cuenta creada con éxito 💚");
      button.textContent = "Crear cuenta";
      button.disabled = false;

      // Redirigir al login
      // window.location.href = "login.html";

    }, 1200);
  });
}


// ===============================
// VALIDAR EMAIL
// ===============================

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
