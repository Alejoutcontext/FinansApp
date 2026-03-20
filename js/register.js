// ============================================
// VALIDADORES POR TIPO DOCUMENTO
// ============================================
const docValidators = {
  CC: { regex: /^\d{6,10}$/, ayuda: '6 a 10 dígitos numéricos' },
  CE: { regex: /^\d{6,7}$/,  ayuda: '6 a 7 dígitos numéricos' },
  TI: { regex: /^\d{10}$/,   ayuda: '10 dígitos numéricos' },
  PP: { regex: /^[A-Z0-9]{6,20}$/i, ayuda: '6 a 20 caracteres alfanuméricos' },
  NU: { regex: /^\d{10}$/,   ayuda: '10 dígitos numéricos' }
};

function validarCCDigito(cc) {
  cc = cc.replace(/[^\d]/g, '');
  if (cc.length !== 10) return false;
  let sum = 0, factor = 2;
  for (let i = cc.length - 2; i >= 0; i--) {
    let d = parseInt(cc[i]) * factor;
    sum += d > 9 ? d - 9 : d;
    factor = factor === 2 ? 1 : 2;
  }
  const dv = 10 - (sum % 10);
  return parseInt(cc[9]) === (dv === 10 ? 0 : dv);
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarTelefono(tel) {
  return /^\d{7,15}$/.test(tel.replace(/\s/g, ''));
}

function setMensaje(id, msg, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `help-text help-text--${tipo}`;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? '⏳ Verificando documento...' : 'Crear cuenta verificada';
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function () {

  const docTypeSelect  = document.getElementById('docType');
  const docNumberInput = document.getElementById('docNumber');
  const passwordInput  = document.getElementById('regPassword');
  const password2Input = document.getElementById('regPassword2');

  // ── Toggle mostrar/ocultar contraseña ──
  document.querySelectorAll('.toggle-eye').forEach(function (eye) {
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

  // ── Cambio tipo documento ──
  docTypeSelect.addEventListener('change', function () {
    const validator = docValidators[this.value];
    if (validator) {
      setMensaje('docHelp', 'Formato ' + this.value + ': ' + validator.ayuda, 'info');
      document.getElementById('docStatus').textContent = '';
      docNumberInput.value = '';
    } else {
      setMensaje('docHelp', 'Selecciona primero el tipo de documento', '');
    }
  });

  // ── Validación número documento ──
  docNumberInput.addEventListener('input', function () {
    const docType   = docTypeSelect.value;
    const docNumber = this.value.replace(/\s/g, '').toUpperCase();
    const status    = document.getElementById('docStatus');

    if (!docType) {
      setMensaje('docHelp', 'Selecciona primero el tipo de documento', 'error');
      return;
    }

    const validator = docValidators[docType];
    if (validator.regex.test(docNumber)) {
      status.textContent = '✅';
      setMensaje('docHelp', 'Formato correcto para ' + docType, 'success');
    } else {
      status.textContent = '❌';
      setMensaje('docHelp', 'Formato ' + docType + ': ' + validator.ayuda, 'error');
    }
  });

  // ── Barra fortaleza contraseña ──
  passwordInput.addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('strengthBar');
    const txt = document.getElementById('strengthText');
    if (!bar || !txt) return;

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
      { w: '100%', color: '#22c55e', label: '🟢 ¡Fuerte!' }
    ];

    bar.style.width           = niveles[fuerza].w;
    bar.style.backgroundColor = niveles[fuerza].color;
    txt.textContent           = niveles[fuerza].label;
  });

  // ── Coincidencia contraseñas ──
  password2Input.addEventListener('input', function () {
    if (!this.value) {
      setMensaje('matchText', '', '');
      return;
    }
    if (this.value === passwordInput.value) {
      setMensaje('matchText', '✅ Las contraseñas coinciden', 'success');
    } else {
      setMensaje('matchText', '❌ Las contraseñas no coinciden', 'error');
    }
  });

  // ============================================
  // SUBMIT
  // ============================================
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const docType   = docTypeSelect.value;
    const docNumber = docNumberInput.value.replace(/\s/g, '').toUpperCase();
    const name      = document.getElementById('regName').value.trim();
    const email     = document.getElementById('regEmail').value.trim().toLowerCase();
    const prefix    = document.getElementById('phonePrefix').value;
    const phone     = document.getElementById('phone').value.replace(/\s/g, '');
    const password  = passwordInput.value;
    const password2 = password2Input.value;
    const terms     = document.getElementById('terms').checked;
    const btn       = document.getElementById('registerBtn');
    const msgEl     = document.getElementById('formMessage');

    msgEl.textContent = '';
    msgEl.className   = 'message';

    // ── Validaciones ──
    if (!docType || !docNumber) {
      msgEl.textContent = 'Selecciona tipo de documento e ingresa el número.';
      msgEl.className = 'message error';
      return;
    }

    const validator = docValidators[docType];
    if (!validator.regex.test(docNumber)) {
      msgEl.textContent = 'Formato incorrecto para ' + docType + '. ' + validator.ayuda + '.';
      msgEl.className = 'message error';
      return;
    }

    // DESACTIVADO PARA PRUEBAS - Validación del dígito verificador
    // if (docType === 'CC' && !validarCCDigito(docNumber)) {
    //   msgEl.textContent = 'Cédula inválida (dígito verificador incorrecto).';
    //   msgEl.className = 'message error';
    //   return;
    // }

    if (!name) {
      msgEl.textContent = 'El nombre completo es obligatorio.';
      msgEl.className = 'message error';
      return;
    }

    if (!email) {
      msgEl.textContent = 'El correo electrónico es obligatorio.';
      msgEl.className = 'message error';
      return;
    }

    if (!validarEmail(email)) {
      msgEl.textContent = 'El correo electrónico no es válido.';
      msgEl.className = 'message error';
      return;
    }

    if (!phone) {
      msgEl.textContent = 'El teléfono es obligatorio para recuperar tu cuenta.';
      msgEl.className = 'message error';
      return;
    }

    if (!validarTelefono(phone)) {
      msgEl.textContent = 'Número de teléfono inválido (mínimo 7 dígitos).';
      msgEl.className = 'message error';
      return;
    }

    if (password.length < 6) {
      msgEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      msgEl.className = 'message error';
      return;
    }

    if (password !== password2) {
      msgEl.textContent = 'Las contraseñas no coinciden.';
      msgEl.className = 'message error';
      return;
    }

    if (!terms) {
      msgEl.textContent = 'Debes aceptar los términos y condiciones.';
      msgEl.className = 'message error';
      return;
    }

    // ── Verificar duplicados ──
    const users  = JSON.parse(localStorage.getItem('users') || '[]');
    const docKey = docType + '-' + docNumber;

    if (users.find(function (u) { return u.docKey === docKey; })) {
      msgEl.textContent = 'Este documento ya está registrado.';
      msgEl.className = 'message error';
      return;
    }

    if (users.find(function (u) { return u.email === email; })) {
      msgEl.textContent = 'Este correo ya está registrado.';
      msgEl.className = 'message error';
      return;
    }

    // ── Llamar backend ──
    setLoading(btn, true);
    msgEl.textContent = '🔍 Verificando tu documento...';
    msgEl.className   = 'message info';

    try {
      const response = await fetch('/api/verificar-documento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, docNumber })
      });

      const data = await response.json();

      if (!response.ok || !data.valido) {
        msgEl.textContent = data.mensaje || 'Documento no encontrado o inválido.';
        msgEl.className   = 'message error';
        setLoading(btn, false);
        return;
      }

      // Verificar nuevamente si el usuario ya existe (por si las dudas)
      if (users.find(function (u) { return u.docKey === docKey; })) {
        msgEl.textContent = 'Este documento ya está registrado. Intenta iniciar sesión.';
        msgEl.className = 'message error';
        setLoading(btn, false);
        return;
      }

      const newUser = {
        docType, docNumber, docKey,
        name: data.nombre || name,
        email,
        phone: prefix + phone,
        password,
        role: 'usuario',
        verificado: true,
        emailVerificado: true,
        dateCreated: new Date().toISOString().split('T')[0]
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      // DEBUG
      console.log('✅ Usuario guardado:', newUser);
      console.log('📦 Array users:', users);

      msgEl.textContent = '✅ ¡Cuenta creada, ' + newUser.name + '! Redirigiendo...';
      msgEl.className   = 'message success';

      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 1800);

    } catch (error) {
      console.warn('Servidor no disponible:', error.message);

      // En modo offline, verificar que el usuario no exista
      if (users.find(function (u) { return u.docKey === docKey; })) {
        msgEl.textContent = '❌ Este documento ya está registrado. Ve a Iniciar sesión.';
        msgEl.className = 'message error';
        setLoading(btn, false);
        return;
      }

      if (users.find(function (u) { return u.email === email; })) {
        msgEl.textContent = '❌ Este correo ya está registrado. Ve a Iniciar sesión.';
        msgEl.className = 'message error';
        setLoading(btn, false);
        return;
      }

      msgEl.textContent = '⚠️ Servidor no disponible. Creando cuenta en modo offline...';
      msgEl.className   = 'message info';

      const newUser = {
        docType, docNumber, docKey,
        name, email,
        phone: prefix + phone,
        password,
        role: 'usuario',
        verificado: false,
        emailVerificado: true,
        dateCreated: new Date().toISOString().split('T')[0]
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));

      msgEl.textContent = '✅ Cuenta creada en modo offline. Redirigiendo...';
      msgEl.className   = 'message success';

      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 1800);
    }
  });

});
