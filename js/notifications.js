// js/notifications.js
(function () {

  // ── Pedir permiso al cargar ──
  window.pedirPermisoNotificaciones = async function () {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  // ── Mostrar notificación ──
  window.mostrarNotificacion = function (titulo, cuerpo, icono, urlDestino) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const n = new Notification(titulo, {
      body:    cuerpo,
      icon:    icono || "assets/logo.png",
      badge:   "assets/logo.png",
      tag:     urlDestino || "vuelve-a-casa",
      vibrate: [200, 100, 200]
    });

    n.onclick = function () {
      window.focus();
      if (urlDestino) window.location.href = urlDestino;
      n.close();
    };

    setTimeout(() => n.close(), 8000);
  };

  // ── Notificar nuevo caso en la ciudad del usuario ──
  window.notificarNuevoCaso = function (caso) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser) return;

    const ciudadUsuario = (currentUser.city || "").toLowerCase().trim();
    const ciudadCaso    = (caso.ubicacion  || "").toLowerCase().trim();

    const esLocal = ciudadUsuario && ciudadCaso.includes(ciudadUsuario);

    if (esLocal) {
      window.mostrarNotificacion(
        "🚨 Alerta en tu ciudad — " + caso.ubicacion,
        caso.nombre + ", " + caso.edad + " años. ¡Ayuda a encontrarlo/a!",
        caso.foto || "assets/logo.png",
        "case-detail.html?id=" + caso.id
      );
    } else {
      window.mostrarNotificacion(
        "📢 Nuevo caso reportado",
        caso.nombre + " — " + caso.ubicacion,
        caso.foto || "assets/logo.png",
        "case-detail.html?id=" + caso.id
      );
    }
  };

  // ── Notificar a seguidores de un caso ──
  window.notificarSeguidores = function (caso, mensaje) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser) return;

    const seguidores = JSON.parse(localStorage.getItem("seguidores") || "{}");
    const lista      = seguidores[caso.id] || [];
    const esFollower = lista.includes(currentUser.docKey || currentUser.email);

    if (esFollower) {
      window.mostrarNotificacion(
        "🔔 Actualización: " + caso.nombre,
        mensaje || "Hay novedades en este caso.",
        caso.foto || "assets/logo.png",
        "case-detail.html?id=" + caso.id
      );
    }
  };

})();
