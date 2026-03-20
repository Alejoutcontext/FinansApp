document.addEventListener("DOMContentLoaded", function () {

  // ══════════════════════════════════════════
  // PROTECCIÓN DE RUTA
  // ══════════════════════════════════════════
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const ADMIN_EMAIL = "test@test.com";
  const esAdmin = currentUser.email === ADMIN_EMAIL;

  // ══════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  function getCasos()       { return JSON.parse(localStorage.getItem("casos") || "[]"); }
  function saveCasos(casos) { localStorage.setItem("casos", JSON.stringify(casos)); }

  // ══════════════════════════════════════════
  // DATOS USUARIO EN UI
  // ══════════════════════════════════════════
  const iniciales = currentUser.name
    ? currentUser.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  setEl("welcomeName",   currentUser.name || "Usuario");
  setEl("sidebarName",   currentUser.name || "--");
  setEl("sidebarDoc",    `${currentUser.docType || "CC"}: ${currentUser.docNumber || currentUser.email || "--"}`);
  setEl("sidebarAvatar", iniciales);
  setEl("profileAvatar", iniciales);
  setEl("profileName",   currentUser.name || "--");
  setEl("profileDoc",    `${currentUser.docType || "CC"}: ${currentUser.docNumber || "--"}`);
  setEl("profileEmail",  `📧 ${currentUser.email || "No registrado"}`);
  setEl("profilePhone",  `📱 ${currentUser.phone || "No registrado"}`);
  setEl("profileDate",   `📅 Registrado el ${currentUser.dateCreated || "--"}`);
  setEl("profileRole",   esAdmin ? "👑 Administrador" : currentUser.role || "usuario");
  setEl("fechaHoy",      new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  }));

  if (currentUser.emailVerificado) {
    const alertaV = document.getElementById("alertVerificacion");
    if (alertaV) alertaV.style.display = "none";
    const badgeV = document.getElementById("profileVerificado");
    if (badgeV) {
      badgeV.textContent = "✅ Verificado";
      badgeV.classList.add("profile-badge--success");
    }
  }

  if (esAdmin) {
    const nav = document.querySelector(".sidebar-nav");
    if (nav) {
      const adminLink = document.createElement("a");
      adminLink.href = "#";
      adminLink.className = "nav-item nav-item--admin";
      adminLink.dataset.section = "admin";
      adminLink.innerHTML = `<span class="nav-icon">👑</span><span>Panel Admin</span><span class="nav-badge nav-badge--red" id="badgePendientes">0</span>`;
      nav.appendChild(adminLink);
    }
  }

  // ══════════════════════════════════════════
  // CERRAR SESIÓN
  // ══════════════════════════════════════════
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      console.log("Logout clicked"); // Debug
      e.preventDefault();
      e.stopPropagation();
      
      // Establecer bandera para el login
      sessionStorage.setItem("justLoggedOut", "true");
      console.log("Set logout flag"); // Debug
      
      // Limpiar toda la sesión
      localStorage.removeItem("currentUser");
      localStorage.removeItem("users");
      localStorage.removeItem("casos");
      localStorage.removeItem("caseForums");
      console.log("Cleared localStorage"); // Debug
      
      // Redirigir al login
      console.log("Redirecting to login..."); // Debug
      setTimeout(function() {
        window.location.replace("login.html");
      }, 100);
    });
  } else {
    console.warn("logoutBtn no encontrado en el DOM");
  }

  // ══════════════════════════════════════════
  // NAVEGACIÓN
  // ══════════════════════════════════════════
  const secciones = {
    inicio:      "secInicio",
    reportar:    "secReportar",
    casos:       "secCasos",
    encontrados: "secEncontrados",
    perfil:      "secPerfil",
    admin:       "secAdmin"
  };

  const titulos = {
    inicio:      "Panel principal",
    reportar:    "Reportar caso",
    casos:       "Casos activos",
    encontrados: "Personas encontradas",
    perfil:      "Mi perfil",
    admin:       "👑 Panel de administración"
  };

  function navegar(sec) {
    if (!secciones[sec]) return;

    Object.values(secciones).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("section--active");
    });

    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("nav-item--active"));

    const secEl = document.getElementById(secciones[sec]);
    if (secEl) secEl.classList.add("section--active");

    const navEl = document.querySelector(`.nav-item[data-section="${sec}"]`);
    if (navEl) navEl.classList.add("nav-item--active");

    setEl("topbarTitle", titulos[sec] || "");

    sidebar.classList.remove("sidebar--open");
    overlay.classList.remove("sidebar-overlay--show");

    if (sec === "casos")       renderCasos();
    if (sec === "encontrados") renderEncontrados();
    if (sec === "perfil")      renderPerfil();   // ← llama renderPerfil completo (incluye renderMisReportes + renderCasosSeguidos)
    if (sec === "inicio")      actualizarStats();
    if (sec === "admin")       renderAdmin();
  }

  document.addEventListener("click", function (e) {
    const target = e.target.closest("[data-section]");
    if (target) {
      e.preventDefault();
      navegar(target.dataset.section);
    }
  });

  // ══════════════════════════════════════════
  // MENÚ HAMBURGUESA
  // ══════════════════════════════════════════
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  document.getElementById("hamburgerBtn")?.addEventListener("click", () => {
    sidebar.classList.add("sidebar--open");
    overlay.classList.add("sidebar-overlay--show");
  });

  document.getElementById("sidebarClose")?.addEventListener("click", () => {
    sidebar.classList.remove("sidebar--open");
    overlay.classList.remove("sidebar-overlay--show");
  });

  overlay?.addEventListener("click", () => {
    sidebar.classList.remove("sidebar--open");
    overlay.classList.remove("sidebar-overlay--show");
  });

  // ══════════════════════════════════════════
  // ESTADÍSTICAS
  // ══════════════════════════════════════════
  function actualizarStats() {
    const casos       = getCasos();
    const activos     = casos.filter(c => c.estado === "activo").length;
    const encontrados = casos.filter(c => c.estado === "encontrado").length;
    const misReportes = casos.filter(c => c.autorDocKey === (currentUser.docKey || currentUser.email)).length;
    const pendientes  = casos.filter(c => c.estado === "pendiente").length;

    setEl("statActivos",     activos);
    setEl("statEncontrados", encontrados);
    setEl("statMisReportes", misReportes);
    setEl("badgeCasos",      activos);

    if (esAdmin) {
      setEl("badgePendientes", pendientes);
      const badge = document.getElementById("badgePendientes");
      if (badge) badge.style.display = pendientes > 0 ? "inline-block" : "none";
    }

    renderRecientes(casos.filter(c => c.estado === "activo").slice(-3).reverse());
  }

  // ══════════════════════════════════════════
  // RENDER RECIENTES
  // ══════════════════════════════════════════
  function renderRecientes(casos) {
    const lista = document.getElementById("listaRecientes");
    if (!lista) return;

    if (!casos.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>Aún no hay casos reportados.</p>
          <button class="auth-btn-sm" data-section="reportar">Reportar el primero</button>
        </div>`;
      return;
    }

    lista.innerHTML = casos.map(c => `
      <div style="padding:.8rem 1rem;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:.8rem;">
        ${c.foto
          ? `<img src="${c.foto}" alt="${c.nombre}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
          : `<div style="width:44px;height:44px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">👤</div>`
        }
        <div style="flex:1;">
          <strong>${c.nombre}</strong>
          <div style="font-size:.78rem;color:#6b7280;">${c.edad} años • ${c.ubicacion}</div>
        </div>
        <span style="font-size:.72rem;color:#6b7280;white-space:nowrap;">${c.fecha}</span>
      </div>`).join("");
  }

  // ══════════════════════════════════════════
  // RENDER CASOS ACTIVOS
  // ══════════════════════════════════════════
  async function renderCasos(filtro = "") {
    const lista = document.getElementById("listaCasos");
    if (!lista) return;

    try {
      // Cargar SOLO casos APROBADOS desde API
      const response = await fetch('/api/cases');
      if (!response.ok) throw new Error('Error cargando casos');
      
      let casos = await response.json();
      
      // Actualizar el badge del contador
      const badge = document.querySelector('[data-section="casos"] .stat-number');
      if (badge) {
        badge.textContent = casos.length;
      }
      
      // Filtrar por búsqueda
      if (filtro) {
        const f = filtro.toLowerCase();
        casos = casos.filter(c =>
          (c.name || "").toLowerCase().includes(f) ||
          (c.location || "").toLowerCase().includes(f)
        );
      }

      if (!casos.length) {
        lista.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <span class="empty-icon">📭</span>
            <p>${filtro ? `Sin resultados para "${filtro}"` : "No hay casos activos."}</p>
          </div>`;
        return;
      }

      // Convertir formato de API al formato esperado por casoCardHTML
      lista.innerHTML = casos.map(c => casoCardHTML({
        id: c.id,
        nombre: c.name,
        edad: c.age,
        genero: c.gender,
        fecha: c.date_missing,
        ubicacion: c.location,
        descripcion: c.physical_desc,
        circunstancias: c.disappearance_desc,
        contacto: c.contact_info,
        foto: c.photo_url,
        estado: "activo",
        autorNombre: c.reporter_name,
        fechaReporte: c.created_at
      }, false, true)).join("");
    } catch (err) {
      console.error('Error cargando casos:', err);
      const lista2 = document.getElementById("listaCasos");
      if (lista2) {
        lista2.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Error cargando casos</div>`;
      }
    }
  }

  // ══════════════════════════════════════════
  // RENDER ENCONTRADOS
  // ══════════════════════════════════════════
  function renderEncontrados() {
    const lista = document.getElementById("listaEncontrados");
    if (!lista) return;

    const casos = getCasos().filter(c => c.estado === "encontrado");

    if (!casos.length) {
      lista.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <span class="empty-icon">💚</span>
          <p>Aún no hay personas encontradas.</p>
        </div>`;
      return;
    }

    lista.innerHTML = casos.map(c => casoCardHTML(c, false, false)).join("");
  }

  // ══════════════════════════════════════════
  // PERFIL — RENDER + EDICIÓN
  // ══════════════════════════════════════════
  function renderPerfil() {
    const casos    = getCasos();
    const forums   = JSON.parse(localStorage.getItem("caseForums") || "{}");
    const miDocKey = currentUser.docKey || currentUser.email;

    const avatarImg = document.getElementById("profileAvatarImg");
    const avatarTxt = document.getElementById("profileAvatar");
    if (currentUser.fotoPerfil && avatarImg) {
      avatarImg.src           = currentUser.fotoPerfil;
      avatarImg.style.display = "block";
      if (avatarTxt) avatarTxt.style.display = "none";
    } else {
      if (avatarImg) avatarImg.style.display = "none";
      if (avatarTxt) { avatarTxt.style.display = "flex"; avatarTxt.textContent = iniciales; }
    }

    const sidebarAvEl = document.getElementById("sidebarAvatar");
    if (sidebarAvEl) {
      if (currentUser.fotoPerfil) {
        sidebarAvEl.innerHTML = `<img src="${currentUser.fotoPerfil}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">`;
      } else {
        sidebarAvEl.textContent = iniciales;
      }
    }

    setEl("profileName",  currentUser.name    || "--");
    setEl("profileDoc",   (currentUser.docType || "CC") + ": " + (currentUser.docNumber || "--"));
    setEl("profileEmail", "📧 " + (currentUser.email || "No registrado"));
    setEl("profilePhone", "📱 " + (currentUser.phone  || "No registrado"));
    setEl("profileDate",  "📅 Registrado el " + (currentUser.dateCreated || "--"));
    setEl("profileRole",  esAdmin ? "👑 Administrador" : currentUser.role || "usuario");

    const bioEl  = document.getElementById("profileBio");
    const cityEl = document.getElementById("profileCity");
    if (bioEl)  { bioEl.textContent  = currentUser.bio  || ""; bioEl.style.display  = currentUser.bio  ? "block" : "none"; }
    if (cityEl) { cityEl.textContent = currentUser.city ? "📍 " + currentUser.city : ""; cityEl.style.display = currentUser.city ? "block" : "none"; }

    if (currentUser.emailVerificado) {
      const badgeV = document.getElementById("profileVerificado");
      if (badgeV) { badgeV.textContent = "✅ Verificado"; badgeV.classList.add("profile-badge--success"); }
    }

    const misC      = casos.filter(c => c.autorDocKey === miDocKey);
    const totalComs = Object.values(forums).flat().filter(c => c.authorDocKey === miDocKey).length;

    setEl("profileStatReportes",    misC.length);
    setEl("profileStatEncontrados", misC.filter(c => c.estado === "encontrado").length);
    setEl("profileStatPendientes",  misC.filter(c => c.estado === "pendiente").length);
    setEl("profileStatComentarios", totalComs);

    renderMisReportes();
    renderCasosSeguidos(); // ← AGREGADO AQUÍ
  }

  // ── Cambiar foto de perfil ──
  document.getElementById("btnCambiarFotoPerfil")?.addEventListener("click", () => {
    document.getElementById("inputFotoPerfil")?.click();
  });

  document.getElementById("inputFotoPerfil")?.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    let dataUrl = null;
    if (typeof window.openImageCropper === "function") {
      const result = await window.openImageCropper(file);
      if (!result || !result.dataUrl) return;
      dataUrl = result.dataUrl;
    } else {
      dataUrl = await fileToBase64(file);
    }
    if (!dataUrl) return;
    currentUser.fotoPerfil = dataUrl;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    actualizarUsuarioEnLista(currentUser);
    renderPerfil();
  });

  document.getElementById("btnEditarPerfil")?.addEventListener("click", () => {
    document.getElementById("profileViewMode").style.display = "none";
    document.getElementById("profileEditMode").style.display = "block";
    const phone  = currentUser.phone || "";
    const prefix = ["+57","+1","+34","+52","+58"].find(p => phone.startsWith(p)) || "+57";
    const num    = phone.replace(prefix, "");
    document.getElementById("editName").value         = currentUser.name  || "";
    document.getElementById("editEmail").value        = currentUser.email || "";
    document.getElementById("editPhonePrefix").value  = prefix;
    document.getElementById("editPhone").value        = num;
    document.getElementById("editCity").value         = currentUser.city  || "";
    document.getElementById("editBio").value          = currentUser.bio   || "";
    document.getElementById("editPassword").value     = "";
    document.getElementById("editMessage").textContent = "";
  });

  document.getElementById("btnCancelarEdicion")?.addEventListener("click", () => {
    document.getElementById("profileViewMode").style.display = "block";
    document.getElementById("profileEditMode").style.display = "none";
  });

  document.getElementById("editPassword")?.addEventListener("input", function () {
    const val = this.value;
    const txt = document.getElementById("editPassStrength");
    if (!txt) return;
    if (!val) { txt.textContent = ""; return; }
    let f = 0;
    if (val.length >= 6)          f++;
    if (/[A-Z]/.test(val))        f++;
    if (/[0-9]/.test(val))        f++;
    if (/[^A-Za-z0-9]/.test(val)) f++;
    const niveles = ["", "🔴 Muy débil", "🟠 Débil", "🟡 Buena", "🟢 ¡Fuerte!"];
    txt.textContent = niveles[f] || "";
  });

  document.querySelectorAll(".toggle-eye").forEach(eye => {
    eye.addEventListener("click", function () {
      const field = this.closest(".password-field");
      if (!field) return;
      const input = field.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      this.textContent = input.type === "password" ? "👁️" : "🙈";
    });
  });

  document.getElementById("btnGuardarPerfil")?.addEventListener("click", () => {
    const name     = document.getElementById("editName").value.trim();
    const email    = document.getElementById("editEmail").value.trim().toLowerCase();
    const prefix   = document.getElementById("editPhonePrefix").value;
    const phone    = document.getElementById("editPhone").value.replace(/\s/g, "");
    const city     = document.getElementById("editCity").value.trim();
    const bio      = document.getElementById("editBio").value.trim();
    const password = document.getElementById("editPassword").value;
    const msg      = document.getElementById("editMessage");

    if (!name)  { msg.textContent = "El nombre es obligatorio."; msg.className = "message error"; return; }
    if (!email) { msg.textContent = "El correo es obligatorio."; msg.className = "message error"; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = "El correo no es válido."; msg.className = "message error"; return;
    }
    if (password && password.length < 6) {
      msg.textContent = "La contraseña debe tener al menos 6 caracteres."; msg.className = "message error"; return;
    }

    currentUser.name  = name;
    currentUser.email = email;
    currentUser.phone = prefix + phone;
    currentUser.city  = city;
    currentUser.bio   = bio;
    if (password) currentUser.password = password;

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    actualizarUsuarioEnLista(currentUser);

    msg.textContent = "✅ Perfil actualizado correctamente.";
    msg.className = "message success";

    setEl("welcomeName", currentUser.name.split(" ")[0]);
    setEl("sidebarName", currentUser.name);

    setTimeout(() => {
      document.getElementById("profileViewMode").style.display = "block";
      document.getElementById("profileEditMode").style.display = "none";
      renderPerfil();
    }, 1200);
  });

  function actualizarUsuarioEnLista(user) {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const idx   = users.findIndex(u => u.docKey === user.docKey || u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
      localStorage.setItem("users", JSON.stringify(users));
    }
  }

  // ══════════════════════════════════════════
  // RENDER MIS REPORTES (perfil)
  // ══════════════════════════════════════════
  function renderMisReportes() {
    const lista = document.getElementById("misReportes");
    if (!lista) return;

    const casos = getCasos().filter(c =>
      c.autorDocKey === (currentUser.docKey || currentUser.email)
    );

    if (!casos.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No has publicado reportes aún.</p>
        </div>`;
      return;
    }

    const estadoBadge = {
      pendiente:  { clase: "badge--warning",  texto: "⏳ Pendiente de aprobación" },
      activo:     { clase: "badge--success",  texto: "✅ Aprobado y activo" },
      encontrado: { clase: "badge--found",    texto: "💚 Encontrado" },
      rechazado:  { clase: "badge--rejected", texto: "❌ Rechazado" }
    };

    lista.innerHTML = casos.map(c => {
      const badge = estadoBadge[c.estado] || estadoBadge.pendiente;
      return `
        <div style="padding:.9rem 1rem;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:.8rem;">
          ${c.foto
            ? `<img src="${c.foto}" alt="${c.nombre}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">👤</div>`
          }
          <div style="flex:1;">
            <strong>${c.nombre}</strong>
            <div style="font-size:.78rem;color:#6b7280;">${c.edad} años • ${c.ubicacion}</div>
            ${c.estado === "rechazado" && c.motivoRechazo
              ? `<div style="font-size:.75rem;color:#dc2626;margin-top:.2rem;">Motivo: ${c.motivoRechazo}</div>`
              : ""
            }
          </div>
          <span class="estado-badge ${badge.clase}">${badge.texto}</span>
        </div>`;
    }).join("");
  }

  // ══════════════════════════════════════════
  // RENDER CASOS SEGUIDOS (perfil)  ← MOVIDA ADENTRO DEL DOMContentLoaded
  // ══════════════════════════════════════════
  function renderCasosSeguidos() {
    const lista   = document.getElementById("misCasosSeguidos");
    const countEl = document.getElementById("countCasosSeguidos");
    if (!lista) return;

    const myKey      = currentUser.docKey || currentUser.email;
    const seguidores = JSON.parse(localStorage.getItem("seguidores") || "{}");
    const casos      = getCasos();

    const casosSeguidos = casos.filter(c => {
      const seg = seguidores[c.id] || [];
      return seg.includes(myKey);
    });

    if (countEl) {
      countEl.textContent = casosSeguidos.length + " caso" + (casosSeguidos.length === 1 ? "" : "s");
    }

    if (!casosSeguidos.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔔</span>
          <p>No sigues ningún caso aún.</p>
          <small>Abre un caso y haz clic en "Seguir" para recibir notificaciones.</small>
        </div>`;
      return;
    }

    const estadoBadge = {
      pendiente:  { clase: "badge--warning",  texto: "⏳ Pendiente" },
      activo:     { clase: "badge--success",  texto: "🔍 Activo" },
      encontrado: { clase: "badge--found",    texto: "💚 Encontrado" },
      rechazado:  { clase: "badge--rejected", texto: "❌ Rechazado" }
    };

    lista.innerHTML = casosSeguidos.map(c => {
      const badge = estadoBadge[c.estado] || estadoBadge.pendiente;
      return `
        <div style="padding:.9rem 1rem;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:.8rem;cursor:pointer;"
             onclick="window.location.href='case-detail.html?id=${c.id}'">
          ${c.foto
            ? `<img src="${c.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">👤</div>`
          }
          <div style="flex:1;">
            <strong>${c.nombre}</strong>
            <div style="font-size:.78rem;color:#6b7280;">${c.edad} años • ${c.ubicacion}</div>
          </div>
          <span class="estado-badge ${badge.clase}">${badge.texto}</span>
        </div>`;
    }).join("");
  }

  // ══════════════════════════════════════════
  // CARD DE CASO (reutilizable)
  // ══════════════════════════════════════════
  function casoCardHTML(c, modoAdmin = false, expandible = false) {
    const accionesAdmin = modoAdmin ? "" : `
      <button class="btn-sm btn-sm--green"  onclick="event.stopPropagation(); marcarEncontrado('${c.id}')">✅ Encontrado</button>
      <button class="btn-sm btn-sm--red"    onclick="event.stopPropagation(); eliminarCaso('${c.id}')">🗑 Eliminar</button>`;

    const chip = c.estado === "encontrado"
      ? `<span class="caso-estado-chip caso-estado-chip--encontrado">💚 Encontrado</span>`
      : `<span class="caso-estado-chip caso-estado-chip--activo">🔍 Activo</span>`;

    return `
      <div class="caso-card ${expandible ? "caso-card--expandible" : ""}" data-caso-id="${c.id}">
        ${c.foto
          ? `<img src="${c.foto}" alt="${c.nombre}" class="caso-foto">`
          : `<div class="caso-foto-placeholder">👤</div>`
        }
        ${chip}
        <div class="caso-body">
          <div class="caso-nombre">${c.nombre}</div>
          <div class="caso-meta">
            <span>🎂 ${c.edad} años &nbsp;•&nbsp; ${c.genero || "N/E"} &nbsp;•&nbsp; 📅 ${c.fecha}</span>
            <span>📍 ${c.ubicacion}</span>
            ${c.contacto ? `<span>📞 ${c.contacto}</span>` : ""}
          </div>
          ${expandible ? `<div class="caso-toggle-hint">Haz clic para abrir el caso y su foro</div>` : ""}
          <div class="caso-actions">${accionesAdmin}</div>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════
  // PANEL ADMIN
  // ══════════════════════════════════════════
  async function renderAdmin() {
    if (!esAdmin) return;
    const secAdmin = document.getElementById("secAdmin");
    if (!secAdmin) return;

    try {
      // Cargar casos PENDING del API
      const pendingRes = await fetch('/api/cases/pending');
      const pendientes = pendingRes.ok ? await pendingRes.json() : [];

      // Cargar casos ACTIVE del API
      const activeRes = await fetch('/api/cases');
      const aprobados = activeRes.ok ? await activeRes.json() : [];

      const totalReportes = pendientes.length + aprobados.length;

      secAdmin.innerHTML = `
        <h1 class="section-title">👑 Panel de administración</h1>
        <p class="section-subtitle">Gestiona los reportes y casos de la plataforma</p>

        <div class="stats-grid" style="margin-bottom:1.5rem;">
          <div class="stat-card stat-card--orange">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <span class="stat-label">Pendientes</span>
              <span class="stat-number">${pendientes.length}</span>
            </div>
          </div>
          <div class="stat-card stat-card--blue">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
              <span class="stat-label">Total reportes</span>
              <span class="stat-number">${totalReportes}</span>
            </div>
          </div>
          <div class="stat-card stat-card--green">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <span class="stat-label">Aprobados</span>
              <span class="stat-number">${aprobados.length}</span>
            </div>
          </div>
          <div class="stat-card stat-card--purple">
            <div class="stat-icon">❌</div>
            <div class="stat-info">
              <span class="stat-label">Rechazados</span>
              <span class="stat-number">0</span>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-bottom:1.5rem;">
          <div class="panel-header">
            <h3>⏳ Reportes pendientes de aprobación</h3>
            <span style="font-size:.82rem;color:#6b7280;">${pendientes.length} pendiente(s)</span>
          </div>
          <div style="padding:.5rem;">
            ${pendientes.length === 0
              ? `<div class="empty-state"><span class="empty-icon">✅</span><p>No hay reportes pendientes.</p></div>`
              : pendientes.map(c => adminCasoHTML({
                  id: c.id,
                  nombre: c.name,
                  edad: c.age,
                  ubicacion: c.location,
                  fecha: c.date_missing,
                  descripcion: c.physical_desc,
                  contacto: c.contact_info,
                  foto: c.photo_url,
                  autorNombre: c.reporter_name,
                  fechaReporte: c.created_at
                })).join("")
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>📋 Todos los casos aprobados</h3>
          </div>
          <div style="padding:.5rem;">
            ${aprobados.length === 0
              ? `<div class="empty-state"><span class="empty-icon">📭</span><p>No hay casos aprobados aún.</p></div>`
              : aprobados.map(c => adminCasoAprobadoHTML({
                  id: c.id,
                  nombre: c.name,
                  edad: c.age,
                  ubicacion: c.location,
                  fecha: c.date_missing,
                  descripcion: c.physical_desc,
                  contacto: c.contact_info,
                  foto: c.photo_url,
                  autorNombre: c.reporter_name,
                  fechaReporte: c.created_at
                })).join("")
            }
          </div>
        </div>`;
    } catch (err) {
      console.error('Error cargando admin panel:', err);
      secAdmin.innerHTML = '<div class="empty-state">Error cargando panel de administración</div>';
    }
  }

  function adminCasoHTML(c) {
    return `
      <div class="admin-caso-card" id="adminCard-${c.id}">
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          ${c.foto
            ? `<img src="${c.foto}" alt="${c.nombre}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:70px;height:70px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;">👤</div>`
          }
          <div style="flex:1;">
            <strong style="font-size:1rem;">${c.nombre}</strong>
            <div style="font-size:.8rem;color:#6b7280;margin-top:.2rem;">
              🎂 ${c.edad} años &nbsp;•&nbsp; 📍 ${c.ubicacion} &nbsp;•&nbsp; 📅 ${c.fecha}
            </div>
            ${c.descripcion ? `<div style="font-size:.8rem;color:#374151;margin-top:.3rem;">📝 ${c.descripcion}</div>` : ""}
            ${c.contacto    ? `<div style="font-size:.8rem;color:#374151;margin-top:.2rem;">📞 ${c.contacto}</div>` : ""}
            <div style="font-size:.75rem;color:#9ca3af;margin-top:.3rem;">
              👤 Reportado por: ${c.autorNombre || "Anónimo"} &nbsp;•&nbsp; 📅 ${c.fechaReporte}
            </div>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn-sm btn-sm--green" onclick="aprobarCaso('${c.id}')">✅ Aprobar</button>
          <button class="btn-sm btn-sm--red"   onclick="mostrarRechazo('${c.id}')">❌ Rechazar</button>
        </div>
        <div id="rechazoForm-${c.id}" style="display:none;margin-top:.8rem;">
          <input type="text" id="motivoInput-${c.id}" class="form-input"
            placeholder="Motivo del rechazo (obligatorio)" style="margin-bottom:.5rem;">
          <div style="display:flex;gap:.5rem;">
            <button class="btn-sm btn-sm--red"  onclick="confirmarRechazo('${c.id}')">Confirmar rechazo</button>
            <button class="btn-sm btn-sm--blue" onclick="cancelarRechazo('${c.id}')">Cancelar</button>
          </div>
        </div>
      </div>`;
  }

  function adminCasoAprobadoHTML(c) {
    const estadoColor = { activo: "#dbeafe", encontrado: "#dcfce7", rechazado: "#fee2e2" };
    const estadoTexto = { activo: "🔍 Activo", encontrado: "💚 Encontrado", rechazado: "❌ Rechazado" };

    return `
      <div class="admin-caso-card">
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          ${c.foto
            ? `<img src="${c.foto}" alt="${c.nombre}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:60px;height:60px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">👤</div>`
          }
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
              <strong>${c.nombre}</strong>
              <span style="font-size:.72rem;padding:.15rem .5rem;border-radius:99px;background:${estadoColor[c.estado] || "#f3f4f6"};">
                ${estadoTexto[c.estado] || c.estado}
              </span>
            </div>
            <div style="font-size:.78rem;color:#6b7280;margin-top:.2rem;">
              🎂 ${c.edad} años &nbsp;•&nbsp; 📍 ${c.ubicacion} &nbsp;•&nbsp; 📅 ${c.fecha}
            </div>
            <div style="font-size:.75rem;color:#9ca3af;margin-top:.2rem;">
              👤 ${c.autorNombre || "Anónimo"} &nbsp;•&nbsp; ${c.fechaReporte}
            </div>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn-sm btn-sm--blue"  onclick="editarCaso('${c.id}')">✏️ Editar</button>
          ${c.estado === "activo"
            ? `<button class="btn-sm btn-sm--green" onclick="marcarEncontrado('${c.id}')">✅ Encontrado</button>`
            : ""
          }
          <button class="btn-sm btn-sm--red" onclick="eliminarCaso('${c.id}')">🗑 Eliminar</button>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════
  // BUSCADOR
  // ══════════════════════════════════════════
  document.getElementById("searchInput")?.addEventListener("input", function () {
    renderCasos(this.value.trim());
  });

  document.getElementById("listaCasos")?.addEventListener("click", function (e) {
    const card = e.target.closest(".caso-card--expandible");
    if (!card) return;
    if (e.target.closest("button, a, input, select, textarea, label")) return;
    const casoId = card.dataset.casoId;
    if (!casoId) return;
    window.location.href = `case-detail.html?id=${encodeURIComponent(casoId)}`;
  });

  // ══════════════════════════════════════════
  // FOTO UPLOAD
  // ══════════════════════════════════════════
  let fotoBase64 = null;

  const fotoInput       = document.getElementById("rpFoto");
  const fotoZone        = document.getElementById("fotoUploadZone");
  const fotoPlaceholder = document.getElementById("fotoPlaceholder");
  const fotoPreview     = document.getElementById("fotoPreview");
  const fotoImg         = document.getElementById("fotoImg");
  const fotoHelp        = document.getElementById("fotoHelp");

  document.getElementById("btnSeleccionarFoto")?.addEventListener("click", (e) => {
    e.stopPropagation();
    fotoInput?.click();
  });

  fotoZone?.addEventListener("click", (e) => {
    if (e.target === fotoZone) fotoInput?.click();
  });

  fotoInput?.addEventListener("change", async function () {
    if (!this.files[0]) {
      fotoBase64 = null;
      if (fotoPreview) fotoPreview.style.display = "none";
      if (fotoImg) fotoImg.src = "";
      return;
    }
    const raw = await fileToBase64(this.files[0]);
    if (!raw) return;
    if (typeof window.openImageCropper === "function") {
      const result = await window.openImageCropper(this.files[0]);
      if (!result || !result.dataUrl) return;
      fotoBase64 = result.dataUrl;
    } else {
      fotoBase64 = raw;
    }
    if (fotoImg)         fotoImg.src = fotoBase64;
    if (fotoPlaceholder) fotoPlaceholder.style.display = "none";
    if (fotoPreview)     fotoPreview.style.display = "block";
    if (fotoHelp)        fotoHelp.style.display = "none";
    if (fotoZone)        fotoZone.style.border = "2px solid #16a34a";
  });

  async function fileToBase64(file) {
    if (!file) return null;
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize    = 3 * 1024 * 1024;
    if (!validTypes.includes(file.type)) { alert("Solo se permiten imágenes JPG, PNG o WEBP."); return null; }
    if (file.size > maxSize)             { alert("La imagen no puede superar 3MB.");             return null; }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // ══════════════════════════════════════════
  // FORMULARIO REPORTE
  // ══════════════════════════════════════════
  document.getElementById("reportForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const btn    = this.querySelector(".btn-primary");
    const editId = btn?.dataset.editId;

    // ── MODO EDICIÓN ──
    if (editId) {
      e.stopImmediatePropagation();
      const casos = getCasos();
      const idx   = casos.findIndex(c => c.id === editId);
      if (idx === -1) return;

      casos[idx].nombre         = document.getElementById("rpNombre").value.trim();
      casos[idx].edad           = document.getElementById("rpEdad").value.trim();
      casos[idx].genero         = document.getElementById("rpGenero").value;
      casos[idx].fecha          = document.getElementById("rpFecha").value;
      casos[idx].ubicacion      = document.getElementById("rpUbicacion").value.trim();
      casos[idx].descripcion    = document.getElementById("rpDescripcion").value.trim();
      casos[idx].contacto       = document.getElementById("rpContacto").value.trim();
      casos[idx].circunstancias = document.getElementById("rpCircunstancias").value.trim();
      if (fotoBase64) casos[idx].foto = fotoBase64;

      saveCasos(casos);

      const msg = document.getElementById("reportMessage");
      msg.textContent = "✅ Caso actualizado correctamente.";
      msg.className   = "message success";

      btn.textContent = "🚨 Publicar reporte";
      delete btn.dataset.editId;
      actualizarStats();

      setTimeout(() => { msg.textContent = ""; navegar("admin"); }, 1500);
      return;
    }

    // ── MODO NUEVO REPORTE ──
    const nombre    = document.getElementById("rpNombre").value.trim();
    const edad      = document.getElementById("rpEdad").value.trim();
    const genero    = document.getElementById("rpGenero").value;
    const fecha     = document.getElementById("rpFecha").value;
    const ubicacion = document.getElementById("rpUbicacion").value.trim();
    const desc      = document.getElementById("rpDescripcion").value.trim();
    const circunstancias = document.getElementById("rpCircunstancias").value.trim();
    const contacto  = document.getElementById("rpContacto").value.trim();
    const msg       = document.getElementById("reportMessage");

    if (!nombre || !edad || !fecha || !ubicacion) {
      msg.textContent = "⚠️ Nombre, edad, fecha y ubicación son obligatorios.";
      msg.className   = "message error";
      return;
    }

    if (!fotoBase64) {
      if (fotoHelp) { fotoHelp.textContent = "⚠️ La foto es obligatoria."; fotoHelp.style.display = "block"; }
      if (fotoZone) { fotoZone.style.border = "2px dashed #dc2626"; fotoZone.scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }

    // ── ENVIAR AL SERVIDOR ──
    msg.textContent = "⏳ Subiendo imagen...";
    msg.className   = "message info";
    const btnSend = this.querySelector(".btn-primary");
    btnSend.disabled = true;

    try {
      // Primero, subir la imagen
      let photoUrl = null;
      if (fotoBase64) {
        console.log('Subiendo imagen...');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: fotoBase64 })
        });
        
        if (!uploadRes.ok) throw new Error('Error subiendo imagen');
        const uploadData = await uploadRes.json();
        photoUrl = uploadData.imageUrl;
        console.log('Imagen subida:', photoUrl);
      }

      // Luego, enviar los datos del caso
      msg.textContent = "⏳ Enviando reporte...";
      const caseRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nombre,
          age: parseInt(edad) || null,
          gender: genero || null,
          dateMissing: fecha,
          location: ubicacion,
          physicalDescription: desc || null,
          disappearanceDescription: circunstancias || null,
          contactInfo: contacto || null,
          photoUrl: photoUrl
        })
      });
      
      if (!caseRes.ok) throw new Error(`HTTP ${caseRes.status}`);
      const caseData = await caseRes.json();
      
      msg.textContent = "✅ ¡Reporte publicado exitosamente!";
      msg.className   = "message success";

      // Limpiar formulario
      this.reset();
      fotoBase64 = null;
      if (fotoImg)         fotoImg.src = "";
      if (fotoInput)       fotoInput.value = "";
      if (fotoPlaceholder) fotoPlaceholder.style.display = "flex";
      if (fotoPreview)     fotoPreview.style.display = "none";
      if (fotoZone)        fotoZone.style.border = "2px dashed #d1d5db";

      setTimeout(() => {
        msg.textContent = "";
        navegar("casos");
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      msg.textContent = "❌ Error al enviar el reporte: " + err.message;
      msg.className   = "message error";
    } finally {
      btnSend.disabled = false;
    }
  });

  // ══════════════════════════════════════════
  // ACCIONES GLOBALES
  // ══════════════════════════════════════════
  window.marcarEncontrado = function (id) {
    const casos = getCasos();
    const idx   = casos.findIndex(c => c.id === id);
    if (idx !== -1) {
      casos[idx].estado = "encontrado";
      saveCasos(casos);
      renderCasos();
      actualizarStats();
      if (esAdmin) renderAdmin();
    }
  };

  window.eliminarCaso = function (id) {
    if (!confirm("¿Seguro que quieres eliminar este caso?")) return;
    saveCasos(getCasos().filter(c => c.id !== id));
    renderCasos();
    actualizarStats();
    if (esAdmin) renderAdmin();
  };

  window.aprobarCaso = async function (id) {
    if (!esAdmin) return;
    
    try {
      const response = await fetch(`/api/cases/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Error aprobando caso');
      
      alert('✅ Caso aprobado correctamente');
      renderAdmin();
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error aprobando caso: ' + err.message);
    }
  };

  window.mostrarRechazo = function (id) {
    if (!esAdmin) return;
    const form = document.getElementById(`rechazoForm-${id}`);
    if (form) form.style.display = "block";
  };

  window.cancelarRechazo = function (id) {
    if (!esAdmin) return;
    const form = document.getElementById(`rechazoForm-${id}`);
    if (form) form.style.display = "none";
  };

  window.confirmarRechazo = async function (id) {
    if (!esAdmin) return;
    const motivo = document.getElementById(`motivoInput-${id}`)?.value.trim();
    if (!motivo) { alert("Debes ingresar un motivo de rechazo."); return; }
    
    try {
      const response = await fetch(`/api/cases/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: motivo })
      });
      
      if (!response.ok) throw new Error('Error rechazando caso');
      
      alert('❌ Caso rechazado correctamente');
      renderAdmin();
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error rechazando caso: ' + err.message);
    }
  };

  window.editarCaso = function (id) {
    if (!esAdmin) return;
    const caso = getCasos().find(c => c.id === id);
    if (!caso) return;
    document.getElementById("rpCircunstancias").value = caso.circunstancias || "";


    navegar("reportar");

    document.getElementById("rpNombre").value      = caso.nombre      || "";
    document.getElementById("rpEdad").value        = caso.edad        || "";
    document.getElementById("rpGenero").value      = caso.genero      || "";
    document.getElementById("rpFecha").value       = caso.fecha       || "";
    document.getElementById("rpUbicacion").value   = caso.ubicacion   || "";
    document.getElementById("rpDescripcion").value = caso.descripcion || "";
    document.getElementById("rpContacto").value    = caso.contacto    || "";

    if (caso.foto) {
      fotoBase64 = caso.foto;
      if (fotoImg)         fotoImg.src = fotoBase64;
      if (fotoPlaceholder) fotoPlaceholder.style.display = "none";
      if (fotoPreview)     fotoPreview.style.display = "block";
      if (fotoZone)        fotoZone.style.border = "2px solid #16a34a";
    }

    const btn = document.querySelector("#reportForm .btn-primary");
    if (btn) { btn.textContent = "💾 Guardar cambios"; btn.dataset.editId = id; }

    setEl("topbarTitle", "✏️ Editar caso");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════
  actualizarStats();

  if (typeof window.pedirPermisoNotificaciones === "function") {
    window.pedirPermisoNotificaciones();
  }

});
