    // ============================================
// UTILIDADES LOCALSTORAGE
// ============================================
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function setMensaje(id, msg, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `message ${tipo}`;
}

function setLoading(btn, loading, textoNormal, textoLoading) {
  btn.disabled = loading;
  btn.textContent = loading ? textoLoading : textoNormal;
}

// Genera código de 6 dígitos
function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// PASO 1: recover.html
// ============================================
const recoverForm = document.getElementById('recoverForm');

if (recoverForm) {
  let metodoActivo = 'email';

  // Tabs de método
  document.querySelectorAll('.method-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('method-tab--active'));
      this.classList.add('method-tab--active');
      metodoActivo = this.dataset.method;

      document.getElementById('panelEmail').classList.toggle('method-panel--hidden', metodoActivo !== 'email');
      document.getElementById('panelPhone').classList.toggle('method-panel--hidden', metodoActivo !== 'phone');
    });
  });

  recoverForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const btn = document.getElementById('recoverBtn');
    const users = getUsers();
    let usuario = null;
    let contacto = '';

    if (metodoActivo === 'email') {
      const email = document.getElementById('recoverEmail').value.trim().toLowerCase();

      if (!email) {
        setMensaje('recoverMessage', 'Ingresa tu correo electrónico.', 'error');
        return;
      }

      usuario = users.find(u => u.email === email);
      contacto = email;

      if (!usuario) {
        setMensaje('recoverMessage', 'No encontramos una cuenta con ese correo.', 'error');
        return;
      }

    } else {
      const prefix = document.getElementById('recoverPrefix').value;
      const phone  = document.getElementById('recoverPhone').value.replace(/\s/g, '');
      const telefonoCompleto = `${prefix}${phone}`;

      if (!phone) {
        setMensaje('recoverMessage', 'Ingresa tu número de teléfono.', 'error');
        return;
      }

      usuario = users.find(u => u.phone === telefonoCompleto);
      contacto = telefonoCompleto;

      if (!usuario) {
        setMensaje('recoverMessage', 'No encontramos una cuenta con ese teléfono.', 'error');
        return;
      }
    }

    // Generar y guardar código temporal (expira en 10 minutos)
    const codigo = generarCodigo();
    const expira = Date.now() + 10 * 60 * 1000; // 10 minutos

    localStorage.setItem('resetSession', JSON.stringify({
      docKey: usuario.docKey,
      metodo: metodoActivo,
      contacto,
      codigo,
      expira
    }));

    setLoading(btn, true, 'Enviar código', '⏳ Enviando...');

    // Simular envío (aquí conectarás tu backend real)
    setTimeout(() => {
      setLoading(btn, false, 'Enviar código', '⏳ Enviando...');

      // En desarrollo: muestra el código en consola
      console.log(`🔐 CÓDIGO DE RECUPERACIÓN: ${codigo}`);

      setMensaje(
        'recoverMessage',
        `✅ Código enviado a ${metodoActivo === 'email' ? 'tu correo' : 'tu teléfono'}. Revísalo y úsalo antes de 10 minutos.`,
        'success'
      );

      // Redirige al paso 2
      setTimeout(() => {
        window.location.href = 'reset.html';
      }, 1500);

    }, 1200);
  });
}

// ============================================
// PASO 2: reset.html
// ============================================
const resetForm = document.getElementById('resetForm');

if (resetForm) {
  const session = JSON.parse(localStorage.getItem('resetSession') || 'null');

  // Si no hay sesión válida, redirige
  if (!session || Date.now() > session.expira) {
    alert('El enlace expiró o no es válido. Solicita un nuevo código.');
    window.location.href = 'recover.html';
  }

  // Personaliza subtítulo
  const subtitle = document.getElementById('resetSubtitle');
  if (subtitle && session) {
    subtitle.textContent = session.metodo === 'email'
      ? `Ingresa el código enviado a ${session.contacto}`
      : `Ingresa el código enviado a ${session.contacto}`;
  }

  // ── INPUTS DE CÓDIGO (autoavance entre cajas) ──
  const codeDigits = document.querySelectorAll('.code-digit');

  codeDigits.forEach((input, i) => {
    // Solo acepta números
    input.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '');

      // Avanza al siguiente
      if (this.value && i < codeDigits.length - 1) {
        codeDigits[i + 1].focus();
      }

      // Actualiza campo oculto
      const codigo = Array.from(codeDigits).map(d => d.value).join('');
      document.getElementById('codigoCompleto').value = codigo;

      if (codigo.length === 6) {
        document.getElementById('codeHelp').textContent = '';
      }
    });

    // Backspace retrocede
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value && i > 0) {
        codeDigits[i - 1].focus();
      }
    });

    // Pegar código completo
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pegado.split('').forEach((char, j) => {
        if (codeDigits[j]) codeDigits[j].value = char;
      });
      document.getElementById('codigoCompleto').value = pegado;
      if (codeDigits[5]) codeDigits[5].focus();
    });
  });

  // ── TOGGLE CONTRASEÑA ──
  document.querySelectorAll('.toggle-eye').forEach(eye => {
    eye.addEventListener('click', function () {
      const passwordField = this.closest('.password-field');
      if (!passwordField) return;
      const input = passwordField.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;
      const esPassword = input.type === 'password';
      input.type = esPassword ? 'text' : 'password';
      this.textContent = esPassword ? '🙈' : '👁️';
    });
  });

  // ── BARRA FORTALEZA ──
  document.getElementById('newPassword')?.addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('strengthBar');
    const txt = document.getElementById('strengthText');

    let fuerza = 0;
    if (val.length >= 6)          fuerza++;
    if (/[A-Z]/.test(val))        fuerza++;
    if (/[0-9]/.test(val))        fuerza++;
    if (/[^A-Za-z0-9]/.test(val)) fuerza++;

    const niveles = [
      { w: '0%',   color: '#e5e7eb', label: '' },
      { w: '25%',  color: '#ef4444', label: '🔴 Muy débil' },
      { w: '50%',  color: '#f97316', label: '🟠 Débil' },
      { w: '75%',  color: '#eab308', label: '🟡 Buena' },
      { w: '100%', color: '#22c55e', label: '🟢 ¡Fuerte!' },
    ];

    bar.style.width = niveles[fuerza].w;
    bar.style.backgroundColor = niveles[fuerza].color;
    txt.textContent = niveles[fuerza].label;
  });

  // ── MATCH CONTRASEÑAS ──
  document.getElementById('newPassword2')?.addEventListener('input', function () {
    const p1 = document.getElementById('newPassword').value;
    const matchText = document.getElementById('matchText');
    if (!this.value) { matchText.textContent = ''; return; }
    if (this.value === p1) {
      matchText.textContent = '✅ Las contraseñas coinciden';
      matchText.className = 'help-text help-text--success';
    } else {
      matchText.textContent = '❌ Las contraseñas no coinciden';
      matchText.className = 'help-text help-text--error';
    }
  });

  // ── TIMER REENVÍO (60 segundos) ──
  let timerInterval;
  let segundos = 60;

  function iniciarTimer() {
    const resendBtn   = document.getElementById('resendBtn');
    const resendTimer = document.getElementById('resendTimer');
    resendBtn.disabled = true;
    segundos = 60;

    timerInterval = setInterval(() => {
      segundos--;
      resendTimer.textContent = segundos;
      if (segundos <= 0) {
        clearInterval(timerInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Reenviar código';
      }
    }, 1000);
  }

  iniciarTimer();

  document.getElementById('resendBtn')?.addEventListener('click', function () {
    const nuevoCodigo = generarCodigo();
    const sessionActual = JSON.parse(localStorage.getItem('resetSession'));
    sessionActual.codigo  = nuevoCodigo;
    sessionActual.expira  = Date.now() + 10 * 60 * 1000;
    localStorage.setItem('resetSession', JSON.stringify(sessionActual));

    console.log(`🔐 NUEVO CÓDIGO: ${nuevoCodigo}`);
    setMensaje('resetMessage', '✅ Código reenviado. Revisa tu correo o teléfono.', 'success');
    iniciarTimer();
  });

  // ── SUBMIT RESET ──
  resetForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const codigoIngresado = document.getElementById('codigoCompleto').value;
    const newPassword     = document.getElementById('newPassword').value;
    const newPassword2    = document.getElementById('newPassword2').value;
    const btn             = document.getElementById('resetBtn');
    const sessionActual   = JSON.parse(localStorage.getItem('resetSession') || 'null');

    if (!sessionActual || Date.now() > sessionActual.expira) {
      setMensaje('resetMessage', 'El código expiró. Solicita uno nuevo.', 'error');
      setTimeout(() => window.location.href = 'recover.html', 2000);
      return;
    }

    if (codigoIngresado.length !== 6) {
      setMensaje('resetMessage', 'Ingresa los 6 dígitos del código.', 'error');
      document.querySelectorAll('.code-digit')[0]?.focus();
      return;
    }

    if (codigoIngresado !== sessionActual.codigo) {
      setMensaje('resetMessage', '❌ Código incorrecto. Inténtalo de nuevo.', 'error');
      // Sacude las cajas visualmente
      document.querySelector('.code-inputs')?.classList.add('shake');
      setTimeout(() => document.querySelector('.code-inputs')?.classList.remove('shake'), 500);
      return;
    }

    if (newPassword.length < 6) {
      setMensaje('resetMessage', 'La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    if (newPassword !== newPassword2) {
      setMensaje('resetMessage', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    setLoading(btn, true, 'Cambiar contraseña', '⏳ Guardando...');

    // Actualizar contraseña en localStorage
    const users = getUsers();
    const idx = users.findIndex(u => u.docKey === sessionActual.docKey);

    if (idx === -1) {
      setMensaje('resetMessage', 'Usuario no encontrado.', 'error');
      setLoading(btn, false, 'Cambiar contraseña', '');
      return;
    }

    users[idx].password = newPassword;
    saveUsers(users);
    localStorage.removeItem('resetSession'); // Invalida el código usado

    setMensaje('resetMessage', '✅ ¡Contraseña actualizada! Redirigiendo al login...', 'success');

    setTimeout(() => window.location.href = 'login.html', 1800);
  });
}
