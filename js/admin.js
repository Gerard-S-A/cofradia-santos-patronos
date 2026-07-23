import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://dnelcttblraydsuvxntv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZWxjdHRibHJheWRzdXZ4bnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MTMwNTYsImV4cCI6MjEwMDM4OTA1Nn0.9RRGrRpnCFNgefDv76u9UmZyXiir3VA5x8XdC4ARKK4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const isLogin = !!document.getElementById('login-form');
const isAdmin = !!document.getElementById('form-subida');

/* ===== AUTH STATE ===== */
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getProfile(userId) {
  const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single();
  return data;
}

/* ===== LOGIN PAGE ===== */
if (isLogin) {
  const user = await getUser();
  if (user) { window.location.href = '/admin/'; }

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Entrando…';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = 'Email o contraseña incorrectos';
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    } else {
      window.location.href = '/admin/';
    }
  });

  const toggleBtn = document.getElementById('toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const input = document.getElementById('password');
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      toggleBtn.querySelector('.icon-eye').classList.toggle('oculto', showPassword);
      toggleBtn.querySelector('.icon-eye-off').classList.toggle('oculto', !showPassword);
      toggleBtn.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }
}

/* ===== ADMIN PAGE ===== */
if (isAdmin) {
  const user = await getUser();
  if (!user) { window.location.href = '/admin/login.html'; }

  const profile = await getProfile(user.id);
  const isPresidente = profile?.rol === 'presidente';
  const canUpload = ['presidente', 'tesorero', 'secretario'].includes(profile?.rol);

  document.getElementById('user-info').textContent = `${profile?.nombre || user.email} (${profile?.rol || 'sin rol'})`;

  if (!canUpload) {
    document.getElementById('seccion-subida').hidden = true;
  }

  /* --- Logout --- */
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login.html';
  });

  /* --- Categories --- */
  const { data: categorias } = await supabase.from('categorias').select('*').order('id');
  const selectCat = document.getElementById('file-category');
  const filtroContainer = document.querySelector('.filtro-categorias');

  categorias?.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    selectCat.appendChild(opt);

    const btn = document.createElement('button');
    btn.className = 'filtro-btn';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.nombre;
    filtroContainer.appendChild(btn);
  });

  /* --- File upload --- */
  const formSubida = document.getElementById('form-subida');
  const fileInput = document.getElementById('file-input');
  const estadoEl = document.getElementById('subida-estado');
  const btnSubir = document.getElementById('btn-subir');

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const nombreInput = document.getElementById('file-name');
      if (!nombreInput.value) {
        nombreInput.value = fileInput.files[0].name.replace(/\.[^.]+$/, '');
      }
    }
  });

  formSubida.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    btnSubir.disabled = true;
    estadoEl.className = 'subida-estado cargando';
    estadoEl.textContent = 'Subiendo archivo…';

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('archivos')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      estadoEl.className = 'subida-estado err';
      estadoEl.textContent = 'Error al subir: ' + uploadError.message;
      btnSubir.disabled = false;
      return;
    }

    const nombre = document.getElementById('file-name').value.trim();
    const descripcion = document.getElementById('file-desc').value.trim();
    const categoriaId = parseInt(selectCat.value);

    const { error: insertError } = await supabase.from('archivos').insert({
      nombre,
      descripcion,
      categoria_id: categoriaId,
      subido_por: user.id,
      archivo_path: filePath,
      archivo_tamano: file.size,
      archivo_tipo: file.type,
      publicado: false
    });

    if (insertError) {
      estadoEl.className = 'subida-estado err';
      estadoEl.textContent = 'Error al guardar: ' + insertError.message;
    } else {
      estadoEl.className = 'subida-estado ok';
      estadoEl.textContent = 'Archivo subido correctamente';
      formSubida.reset();
      await loadArchivos();
    }
    btnSubir.disabled = false;
  });

  /* --- List files --- */
  let filtroActual = 'todos';

  filtroContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filtro-btn');
    if (!btn) return;
    filtroContainer.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroActual = btn.dataset.cat;
    renderArchivos();
  });

  let allArchivos = [];

  async function loadArchivos() {
    const { data } = await supabase
      .from('archivos')
      .select('*, categorias(nombre), perfiles(nombre)')
      .order('creado_en', { ascending: false });
    allArchivos = data || [];
    renderArchivos();
  }

  function renderArchivos() {
    const container = document.getElementById('lista-archivos');
    const filtered = filtroActual === 'todos'
      ? allArchivos
      : allArchivos.filter(a => a.categoria_id === parseInt(filtroActual));

    if (filtered.length === 0) {
      container.innerHTML = '<p class="lista-vacia">No hay archivos.</p>';
      return;
    }

    container.innerHTML = filtered.map(a => {
      const tamano = a.archivo_tamano > 1048576
        ? (a.archivo_tamano / 1048576).toFixed(1) + ' MB'
        : (a.archivo_tamano / 1024).toFixed(0) + ' KB';
      const fecha = new Date(a.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      const cat = a.categorias?.nombre || 'Sin categoría';
      const autor = a.perfiles?.nombre || 'Desconocido';
      const ext = a.archivo_tipo?.includes('pdf') ? 'PDF'
        : a.archivo_tipo?.includes('word') || a.archivo_tipo?.includes('document') ? 'Word'
        : a.archivo_tipo?.includes('excel') || a.archivo_tipo?.includes('sheet') ? 'Excel'
        : a.archivo_tipo?.includes('image') ? 'IMG' : 'Otro';
      const badgeClass = a.publicado ? 'publicado' : 'borrador';
      const badgeText = a.publicado ? 'Publicado' : 'Borrador';

      let acciones = '';
      if (isPresidente) {
        if (a.publicado) {
          acciones += `<button class="boton-accion despub" data-id="${a.id}" data-action="despublicar">Ocultar</button>`;
        } else {
          acciones += `<button class="boton-accion pub" data-id="${a.id}" data-action="publicar">Publicar</button>`;
        }
        acciones += `<button class="boton-accion borrar" data-id="${a.id}" data-action="borrar">Borrar</button>`;
      }
      acciones += `<a class="boton-accion descargar" href="${SUPABASE_URL}/storage/v1/object/public/archivos/${a.archivo_path}" target="_blank" rel="noopener">Ver</a>`;

      return `
        <div class="archivo-fila" data-id="${a.id}">
          <div class="archivo-info">
            <div class="archivo-nombre">${escapeHtml(a.nombre)}</div>
            <div class="archivo-meta">
              <span>${cat}</span>
              <span>${ext}</span>
              <span>${tamano}</span>
              <span>${fecha}</span>
              <span>${escapeHtml(autor)}</span>
            </div>
          </div>
          <span class="archivo-badge ${badgeClass}">${badgeText}</span>
          <div class="archivo-acciones">${acciones}</div>
        </div>`;
    }).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleAction);
    });
  }

  /* --- Actions --- */
  async function handleAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);

    if (action === 'borrar') {
      showConfirm('¿Seguro que quieres borrar este archivo?', async () => {
        const archivo = allArchivos.find(a => a.id === id);
        if (archivo) {
          await supabase.storage.from('archivos').remove([archivo.archivo_path]);
          await supabase.from('archivos').delete().eq('id', id);
          await loadArchivos();
        }
      });
    } else if (action === 'publicar') {
      await supabase.from('archivos').update({ publicado: true }).eq('id', id);
      await loadArchivos();
    } else if (action === 'despublicar') {
      await supabase.from('archivos').update({ publicado: false }).eq('id', id);
      await loadArchivos();
    }
  }

  /* --- Modal --- */
  function showConfirm(text, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('modal-texto').textContent = text;
    modal.hidden = false;

    const acceptar = document.getElementById('modal-aceptar');
    const cancelar = document.getElementById('modal-cancelar');

    function close() {
      modal.hidden = true;
      acceptar.removeEventListener('click', onAccept);
      cancelar.removeEventListener('click', close);
    }

    async function onAccept() {
      close();
      await onConfirm();
    }

    acceptar.addEventListener('click', onAccept);
    cancelar.addEventListener('click', close);
  }

  /* --- Init --- */
  await loadArchivos();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}