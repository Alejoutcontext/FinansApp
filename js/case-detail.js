document.addEventListener("DOMContentLoaded", async function () {
  const ADMIN_EMAIL = "test@test.com";
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const caseId = new URLSearchParams(window.location.search).get("id");
  if (!caseId) {
    renderMissingCase("No se envió un ID de caso.");
    return;
  }

  try {
    // Cargar desde API
    const response = await fetch('/api/cases');
    if (!response.ok) throw new Error('Error cargando casos');
    const casos = await response.json();
    const caso = casos.find(c => c.id === parseInt(caseId));

    if (!caso) {
      renderMissingCase("No encontramos este caso.");
      return;
    }

    // Convertir formato de API al formato esperado
    const casoFormato = {
      id: caso.id,
      nombre: caso.name,
      edad: caso.age,
      genero: caso.gender,
      fecha: caso.date_missing,
      ubicacion: caso.location,
      descripcion: caso.physical_desc,
      circunstancias: caso.disappearance_desc,
      contacto: caso.contact_info,
      foto: caso.photo_url,
      estado: "activo",
      autorNombre: caso.reporter_name,
      autorDocKey: "sistema",
      fechaReporte: caso.created_at
    };

    // Pedir permiso notificaciones
    if (typeof window.pedirPermisoNotificaciones === "function") {
      window.pedirPermisoNotificaciones();
    }

    renderCase(casoFormato);
    bindSeguir(casoFormato, currentUser);
    bindForum(casoFormato, currentUser, currentUser.email === ADMIN_EMAIL);
  } catch (err) {
    console.error('Error cargando caso:', err);
    renderMissingCase("Error cargando el caso. Intenta de nuevo.");
  }
});

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function renderMissingCase(message) {
  const card = document.getElementById("caseDetailCard");
  if (!card) return;
  card.innerHTML = `<div style="padding:1rem;"><h2>${message}</h2><p>Vuelve al dashboard e intenta abrir otro caso.</p></div>`;
}

function getAvatarHTML(user, size) {
  size = size || 36;
  const users    = JSON.parse(localStorage.getItem("users") || "[]");
  const userData = users.find(u =>
    u.docKey === user.authorDocKey || u.email === user.authorDocKey
  );
  const foto  = userData?.fotoPerfil || null;
  const style = `width:${size}px;height:${size}px;`;

  if (foto) {
    return `<img src="${foto}" alt="${escapeHTML(user.authorName || "Usuario")}" class="forum-avatar" style="${style}">`;
  }

  const name     = user.authorName || user.authorDocKey || "U";
  const initials = name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  return `<div class="forum-avatar-initials" style="${style}">${escapeHTML(initials)}</div>`;
}

// ══════════════════════════════════════════
// RENDER CASO
// ══════════════════════════════════════════
function renderCase(caso) {
  const estadoMap = {
    activo:     { text: "🔍 Activo",     cls: "estado-badge estado-badge--activo" },
    encontrado: { text: "💚 Encontrado", cls: "estado-badge estado-badge--encontrado" },
    pendiente:  { text: "⏳ Pendiente",  cls: "estado-badge estado-badge--pendiente" },
    rechazado:  { text: "❌ Rechazado",  cls: "estado-badge estado-badge--rechazado" }
  };

  setText("caseCircunstancias", caso.circunstancias || "No especificado.");

  const estado = estadoMap[caso.estado] || { text: caso.estado || "Sin estado", cls: "estado-badge" };

  setText("caseNombre",       caso.nombre       || "Sin nombre");
  setText("caseMeta",         `🎂 ${caso.edad || "--"} años • ${caso.genero || "N/E"}`);
  setText("caseDescripcion",  caso.descripcion  || "Sin descripción adicional.");
  setText("caseUbicacion",    caso.ubicacion    || "No disponible");
  setText("caseFecha",        caso.fecha        || "No disponible");
  setText("caseContacto",     caso.contacto     || "No disponible");
  setText("caseAutor",        caso.autorNombre  || "Anónimo");
  setText("caseFechaReporte", caso.fechaReporte || "No disponible");

  const estadoEl = document.getElementById("caseEstado");
  if (estadoEl) {
    estadoEl.className   = estado.cls;
    estadoEl.textContent = estado.text;
  }

  const foto = document.getElementById("caseFoto");
  if (foto) {
    foto.src = caso.foto || "";
    foto.alt = caso.nombre || "Foto del caso";
  }
}

// ══════════════════════════════════════════
// SEGUIR CASO  ← ahora está al nivel correcto
// ══════════════════════════════════════════
function bindSeguir(caso, currentUser) {
  const btn     = document.getElementById("btnSeguirCaso");
  const countEl = document.getElementById("followCount");
  if (!btn || !countEl) return;

  const myKey = currentUser.docKey || currentUser.email;

  function getSeguidores() {
    const data = JSON.parse(localStorage.getItem("seguidores") || "{}");
    return Array.isArray(data[caso.id]) ? data[caso.id] : [];
  }

  function saveSeguidores(lista) {
    const data = JSON.parse(localStorage.getItem("seguidores") || "{}");
    data[caso.id] = lista;
    localStorage.setItem("seguidores", JSON.stringify(data));
  }

  function renderBtn() {
    const lista = getSeguidores();
    const sigo  = lista.includes(myKey);
    countEl.textContent = lista.length;
    btn.textContent     = sigo ? "🔔 Siguiendo" : "🔔 Seguir este caso";
    btn.classList.toggle("following", sigo);
  }

  btn.addEventListener("click", async function () {
    if (typeof window.pedirPermisoNotificaciones === "function") {
      await window.pedirPermisoNotificaciones();
    }

    const lista = getSeguidores();
    const idx   = lista.indexOf(myKey);

    if (idx === -1) {
      lista.push(myKey);
      saveSeguidores(lista);
      renderBtn();
      if (typeof window.mostrarNotificacion === "function") {
        window.mostrarNotificacion(
          "✅ Ahora sigues este caso",
          "Recibirás notificaciones sobre " + caso.nombre,
          caso.foto || "assets/logo.png",
          "case-detail.html?id=" + caso.id
        );
      }
    } else {
      lista.splice(idx, 1);
      saveSeguidores(lista);
      renderBtn();
    }
  });

  renderBtn();
}

// ══════════════════════════════════════════
// FORO
// ══════════════════════════════════════════
function bindForum(caso, currentUser, esAdmin) {
  const listEl    = document.getElementById("forumList");
  const formEl    = document.getElementById("forumForm");
  const textEl    = document.getElementById("forumText");
  const imageEl   = document.getElementById("forumImage");
  const cropBtn   = document.getElementById("forumCropBtn");
  const previewEl = document.getElementById("forumPreview");

  if (!listEl || !formEl || !textEl || !imageEl || !cropBtn || !previewEl) return;

  function getStore() {
    const raw = JSON.parse(localStorage.getItem("caseForums") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  }

  function saveStore(store) {
    localStorage.setItem("caseForums", JSON.stringify(store));
  }

  function getComments() {
    const store = getStore();
    return Array.isArray(store[caso.id]) ? store[caso.id] : [];
  }

  function saveComments(comments) {
    const store = getStore();
    store[caso.id] = comments;
    saveStore(store);
  }

  function renderComments() {
    const comments = getComments().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const countEl  = document.getElementById("forumCount");

    if (countEl) {
      countEl.textContent = `${comments.length} comentario${comments.length === 1 ? "" : "s"}`;
    }

    if (!comments.length) {
      listEl.innerHTML = `<p class="empty-forum">Aún no hay comentarios para este caso.</p>`;
      return;
    }

    const byParent = new Map();
    comments.forEach(comment => {
      const key = comment.parentId || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(comment);
    });

    listEl.innerHTML = renderThread(byParent, "root");
  }

  function renderThread(byParent, parentId) {
    const nodes = byParent.get(parentId) || [];
    return nodes.map(comment => {
      const canDelete  = esAdmin || comment.authorDocKey === (currentUser.docKey || currentUser.email);
      const avatarHTML = getAvatarHTML(comment);

      return `
        <article class="forum-item" data-comment-id="${escapeHTML(comment.id)}">
          <div class="forum-item-head">
            ${avatarHTML}
            <div class="forum-item-head-meta">
              <div class="forum-item-head-row">
                <span class="forum-author">${escapeHTML(comment.authorName || "Usuario")}</span>
                <span class="forum-date">${formatDate(comment.createdAt)}</span>
              </div>
              <p class="forum-text">${escapeHTML(comment.text || "")}</p>
              ${comment.image ? `<img class="forum-image" src="${comment.image}" alt="Evidencia adjunta">` : ""}
              <div class="forum-actions">
                <button class="forum-reply"  data-action="reply-comment">💬 Responder</button>
                ${canDelete ? `<button class="forum-delete" data-action="delete-comment">🗑 Eliminar</button>` : ""}
              </div>
            </div>
          </div>
          <div class="forum-reply-slot"></div>
          <div class="forum-children">${renderThread(byParent, comment.id)}</div>
        </article>`;
    }).join("");
  }

  imageEl.addEventListener("change", async function () {
    delete imageEl.dataset.croppedDataUrl;
    const file = imageEl.files[0];
    if (!file) { previewEl.style.display = "none"; previewEl.src = ""; return; }
    const raw = await fileToBase64(file);
    if (!raw) return;
    previewEl.src = raw;
    previewEl.style.display = "block";
  });

  cropBtn.addEventListener("click", async function () {
    const file = imageEl.files[0];
    if (!file || typeof window.openImageCropper !== "function") return;
    const result = await window.openImageCropper(file);
    if (!result || !result.dataUrl) return;
    imageEl.dataset.croppedDataUrl = result.dataUrl;
    previewEl.src = result.dataUrl;
    previewEl.style.display = "block";
  });

  formEl.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text        = textEl.value.trim();
    const file        = imageEl.files[0];
    const croppedData = imageEl.dataset.croppedDataUrl || "";
    if (text.length < 3 && !file && !croppedData) return;

    let image = croppedData || null;
    if (!image && file) {
      image = await fileToBase64(file);
      if (!image) return;
    }

    const comments = getComments();
    comments.push({
      id:           `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      caseId:       caso.id,
      parentId:     null,
      text,
      image,
      authorName:   currentUser.name   || currentUser.email || "Usuario",
      authorDocKey: currentUser.docKey || currentUser.email,
      createdAt:    new Date().toISOString()
    });

    saveComments(comments);
    textEl.value = "";
    imageEl.value = "";
    delete imageEl.dataset.croppedDataUrl;
    previewEl.style.display = "none";
    previewEl.src = "";
    renderComments();

    // Notificar seguidores
    if (typeof window.notificarSeguidores === "function") {
      window.notificarSeguidores(caso, "Nuevo comentario de " + (currentUser.name || "un usuario"));
    }
  });

  listEl.addEventListener("click", async function (e) {

    const replyBtn = e.target.closest("[data-action='reply-comment']");
    if (replyBtn) {
      const item = replyBtn.closest("[data-comment-id]");
      if (!item) return;
      const slot = item.querySelector(".forum-reply-slot");
      if (!slot) return;
      if (slot.querySelector(".reply-form")) { slot.innerHTML = ""; return; }
      slot.innerHTML = `
        <form class="reply-form">
          <textarea maxlength="800" placeholder="Escribe tu respuesta..."></textarea>
          <div class="forum-form-row">
            <label class="file-label">Adjuntar imagen</label>
            <input type="file" accept="image/jpeg,image/png,image/webp">
            <button type="button" class="forum-crop-btn" data-action="crop-reply-image">✂️ Recortar</button>
          </div>
          <img class="forum-image forum-image--preview" src="" alt="Vista previa" style="display:none;">
          <div class="reply-form-row">
            <button type="button" class="reply-cancel" data-action="cancel-reply">Cancelar</button>
            <button type="submit" class="reply-submit">Responder</button>
          </div>
        </form>`;
      return;
    }

    const cancelBtn = e.target.closest("[data-action='cancel-reply']");
    if (cancelBtn) {
      const slot = cancelBtn.closest(".forum-reply-slot");
      if (slot) slot.innerHTML = "";
      return;
    }

    const cropReplyBtn = e.target.closest("[data-action='crop-reply-image']");
    if (cropReplyBtn) {
      const form      = cropReplyBtn.closest(".reply-form");
      const fileInput = form?.querySelector("input[type='file']");
      const preview   = form?.querySelector(".forum-image--preview");
      const file      = fileInput?.files?.[0];
      if (!fileInput || !preview || !file || typeof window.openImageCropper !== "function") return;
      const result = await window.openImageCropper(file);
      if (!result || !result.dataUrl) return;
      fileInput.dataset.croppedDataUrl = result.dataUrl;
      preview.src = result.dataUrl;
      preview.style.display = "block";
      return;
    }

    const replyForm = e.target.closest(".reply-form");
    if (replyForm && e.target.matches(".reply-submit")) {
      e.preventDefault();
      const item = replyForm.closest("[data-comment-id]");
      if (!item) return;
      const parentId = item.dataset.commentId;
      if (!parentId) return;

      const textarea    = replyForm.querySelector("textarea");
      const fileInput   = replyForm.querySelector("input[type='file']");
      const croppedData = fileInput?.dataset?.croppedDataUrl || "";
      const text        = (textarea?.value || "").trim();
      const file        = fileInput?.files?.[0];
      if (text.length < 2 && !file && !croppedData) return;

      let image = croppedData || null;
      if (!image && file) {
        image = await fileToBase64(file);
        if (!image) return;
      }

      const comments = getComments();
      comments.push({
        id:           `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        caseId:       caso.id,
        parentId,
        text,
        image,
        authorName:   currentUser.name   || currentUser.email || "Usuario",
        authorDocKey: currentUser.docKey || currentUser.email,
        createdAt:    new Date().toISOString()
      });

      saveComments(comments);
      renderComments();
      return;
    }

    const deleteBtn = e.target.closest("[data-action='delete-comment']");
    if (!deleteBtn) return;
    const item = deleteBtn.closest("[data-comment-id]");
    if (!item) return;
    const commentId = item.dataset.commentId;
    if (!commentId) return;

    const comments = getComments();
    const selected  = comments.find(c => c.id === commentId);
    if (!selected)  return;

    const canDelete = esAdmin || selected.authorDocKey === (currentUser.docKey || currentUser.email);
    if (!canDelete) return;

    const toDelete = new Set([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      comments.forEach(comment => {
        if (comment.parentId && toDelete.has(comment.parentId) && !toDelete.has(comment.id)) {
          toDelete.add(comment.id);
          changed = true;
        }
      });
    }

    saveComments(comments.filter(c => !toDelete.has(c.id)));
    renderComments();
  });

  listEl.addEventListener("change", async function (e) {
    const replyImageInput = e.target.closest(".reply-form input[type='file']");
    if (!replyImageInput) return;
    const form    = replyImageInput.closest(".reply-form");
    const preview = form?.querySelector(".forum-image--preview");
    delete replyImageInput.dataset.croppedDataUrl;
    const file = replyImageInput.files[0];
    if (!preview) return;
    if (!file) { preview.style.display = "none"; preview.src = ""; return; }
    const raw = await fileToBase64(file);
    if (!raw) return;
    preview.src = raw;
    preview.style.display = "block";
  });

  renderComments();
}

// ══════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoDate) {
  if (!isoDate) return "--";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}
