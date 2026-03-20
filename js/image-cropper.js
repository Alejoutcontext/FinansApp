// js/image-cropper.js
(function () {
  // Solo crea el modal una vez
  if (window.openImageCropper) return;

  const STYLE_ID = "global-image-cropper-style";

  // CSS embebido para el modal
  const modalCSS = `
  #cropperOverlay {
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,.65);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  #cropperOverlay.show { display: flex; }

  .cropper-modal {
    background: #0f172a;
    color: #e5e7eb;
    border-radius: 14px;
    width: min(480px, 92%);
    padding: 1rem 1.1rem 1.1rem;
    box-shadow: 0 20px 60px rgba(15,23,42,.75);
    display: grid;
    gap: .7rem;
  }

  .cropper-header {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:.5rem;
  }

  .cropper-header h2 {
    margin:0;
    font-size:1rem;
    font-weight:600;
  }

  .cropper-close {
    border:none;
    background:transparent;
    color:#9ca3af;
    font-size:1.1rem;
    cursor:pointer;
  }

  .cropper-body {
    background:#020617;
    border-radius:12px;
    padding:.6rem;
    display:flex;
    justify-content:center;
    align-items:center;
    min-height:260px;
  }

  #cropperCanvas {
    max-width:100%;
    max-height:320px;
    border-radius:10px;
    background:#020617;
  }

  .cropper-footer {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:.75rem;
    flex-wrap:wrap;
  }

  .cropper-zoom {
    flex:1;
    display:flex;
    align-items:center;
    gap:.4rem;
    font-size:.8rem;
    color:#9ca3af;
  }

  .cropper-zoom input[type="range"] {
    flex:1;
  }

  .cropper-actions {
    display:flex;
    gap:.5rem;
  }

  .cropper-btn {
    border:none;
    border-radius:10px;
    padding:.45rem .9rem;
    font-size:.85rem;
    font-weight:600;
    font-family:inherit;
    cursor:pointer;
  }

  .cropper-btn--secondary {
    background:#020617;
    color:#e5e7eb;
    border:1px solid #4b5563;
  }

  .cropper-btn--primary {
    background:#2563eb;
    color:#fff;
  }
  `;

  // Inyectar CSS global
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = modalCSS;
    document.head.appendChild(style);
  }

  // Crear overlay + contenido
  const overlay = document.createElement("div");
  overlay.id = "cropperOverlay";
  overlay.innerHTML = `
    <div class="cropper-modal">
      <div class="cropper-header">
        <h2>Recortar imagen</h2>
        <button class="cropper-close" type="button" aria-label="Cerrar">✕</button>
      </div>
      <div class="cropper-body">
        <canvas id="cropperCanvas"></canvas>
      </div>
      <div class="cropper-footer">
        <div class="cropper-zoom">
          <span>Zoom</span>
          <input id="cropperZoom" type="range" min="1" max="3" step="0.1" value="1">
        </div>
        <div class="cropper-actions">
          <button type="button" class="cropper-btn cropper-btn--secondary" data-action="cancel">Cancelar</button>
          <button type="button" class="cropper-btn cropper-btn--primary" data-action="apply">Aplicar recorte</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector("#cropperCanvas");
  const zoomInput = overlay.querySelector("#cropperZoom");
  const ctx = canvas.getContext("2d");

  let img = null;
  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let resolvePromise = null;
  let rejectPromise = null;

  function resetState() {
    img = null;
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    isDragging = false;
    zoomInput.value = "1";
  }

  function closeOverlay() {
    overlay.classList.remove("show");
    resetState();
    if (rejectPromise) {
      rejectPromise(null);
      resolvePromise = null;
      rejectPromise = null;
    }
  }

  overlay.querySelector(".cropper-close").addEventListener("click", closeOverlay);
  overlay.querySelector("[data-action='cancel']").addEventListener("click", closeOverlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeOverlay();
  });

  zoomInput.addEventListener("input", () => {
    zoom = parseFloat(zoomInput.value || "1");
    draw();
  });

  canvas.addEventListener("mousedown", e => {
    if (!img) return;
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => { isDragging = false; });

  window.addEventListener("mousemove", e => {
    if (!isDragging || !img) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    offsetX += dx;
    offsetY += dy;
    draw();
  });

  function draw() {
    if (!img) return;

    const size = Math.min(360, window.innerWidth * 0.8);
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.max(
      canvas.width / img.width,
      canvas.height / img.height
    ) * zoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const x = canvas.width / 2 - drawW / 2 + offsetX;
    const y = canvas.height / 2 - drawH / 2 + offsetY;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, drawW, drawH);

    // marco
    ctx.strokeStyle = "rgba(148,163,184,.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  // Acción aplicar
  overlay.querySelector("[data-action='apply']").addEventListener("click", () => {
    if (!img || !resolvePromise) return;
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      overlay.classList.remove("show");
      const result = { dataUrl };
      resolvePromise(result);
    } catch (e) {
      if (rejectPromise) rejectPromise(e);
    } finally {
      resetState();
      resolvePromise = null;
      rejectPromise = null;
    }
  });

  // API pública
  window.openImageCropper = function (fileOrDataUrl) {
    return new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;

      const image = new Image();
      image.onload = () => {
        img = image;
        offsetX = 0;
        offsetY = 0;
        zoom = 1;
        zoomInput.value = "1";
        overlay.classList.add("show");
        draw();
      };
      image.onerror = () => {
        reject(null);
      };

      if (typeof fileOrDataUrl === "string") {
        image.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = e => { image.src = e.target.result; };
        reader.onerror = () => reject(null);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

})();
