document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("loginForm");
  const message = document.getElementById("message");
  const button = document.getElementById("loginBtn");
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  const cedulaInput = document.getElementById("cedula");
  
  // Obtener bandera de logout
  const justLoggedOut = sessionStorage.getItem("justLoggedOut");
  console.log("justLoggedOut flag:", justLoggedOut); // Debug
  
  // Obtener usuario actual
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  console.log("currentUser exists:", !!currentUser); // Debug

  // Solo redirigir al dashboard si hay sesión activa Y no vienes de logout
  if (currentUser && currentUser.email && !justLoggedOut) {
    console.log("Redirecting to dashboard..."); // Debug
    window.location.replace("dashboard.html");
    return;
  }
  
  // Limpiar la bandera de logout para próximas visitas
  if (justLoggedOut) {
    console.log("Clearing logout flag"); // Debug
    sessionStorage.removeItem("justLoggedOut");
  }

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
      const esPassword = passwordInput.type === "password";
      passwordInput.type = esPassword ? "text" : "password";
      this.textContent = esPassword ? "🙈" : "👁️";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const cedula = (cedulaInput?.value || "").trim().replace(/\D/g, "");
    const password = (passwordInput?.value || "").trim();

    message.textContent = "";
    message.className = "message";

    if (!cedula || !password) {
      message.textContent = "Completa todos los campos.";
      message.classList.add("error");
      return;
    }

    if (!/^\d{6,10}$/.test(cedula)) {
      message.textContent = "La cédula debe tener entre 6 y 10 dígitos.";
      message.classList.add("error");
      return;
    }

    button.disabled = true;
    button.textContent = "⏳ Verificando...";

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      console.log("🔍 Usuarios guardados en 'users':", users); // DEBUG
      
      // Intenta buscar en el array "users"
      let user = users.find(u =>
        (u.docNumber === cedula || u.docNumber === cedula.toUpperCase()) &&
        u.password === password
      );
      
      // Si no encuentra en "users", intenta buscar en "currentUser" (para acceso rápido)
      if (!user) {
        const lastUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        console.log("🔍 Último usuario registrado:", lastUser); // DEBUG
        if (lastUser && 
            (lastUser.docNumber === cedula || lastUser.docNumber === cedula.toUpperCase()) &&
            lastUser.password === password) {
          user = lastUser;
          // Guardar en array "users" también
          if (!users.find(u => u.email === user.email)) {
            users.push(user);
            localStorage.setItem("users", JSON.stringify(users));
          }
        }
      }
      
      console.log("✅ Usuario encontrado:", user); // DEBUG

      // Usuario de prueba para desarrollo
      if (!user && cedula === "0000000000" && password === "1234") {
        user = {
          name: "Usuario Prueba",
          email: "test@test.com",
          docType: "CC",
          docNumber: "0000000000",
          docKey: "CC-0000000000",
          phone: "+573001234567",
          role: "admin",
          emailVerificado: true,
          dateCreated: "2026-02-24"
        };

        if (!users.find(u => u.email === user.email)) {
          users.push(user);
          localStorage.setItem("users", JSON.stringify(users));
        }
      }

      if (!user) {
        message.textContent = "Cédula o contraseña incorrectas.";
        message.classList.add("error");
        button.disabled = false;
        button.textContent = "Iniciar sesión";
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(user));

      message.textContent = `✅ Bienvenido, ${user.name.split(" ")[0]}. Redirigiendo...`;
      message.classList.add("success");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 800);
    }, 800);
  });
});
