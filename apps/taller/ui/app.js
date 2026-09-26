/** UI minima del Taller */
const estado = {
  idioma: 'es',
  mensajes: {},
  marca: null,
  tipografias: [],
  bandeja: [],
  ultimoGenerado: null,
};

function t(clave, vars) {
  let txt = estado.mensajes[clave] || clave;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      txt = txt.replaceAll(`{${k}}`, String(v));
    }
  }
  return txt;
}

function aplicarTraducciones() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const clave = el.getAttribute('data-i18n');
    if (clave) el.textContent = t(clave);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const clave = el.getAttribute('data-i18n-placeholder');
    if (clave) el.setAttribute('placeholder', t(clave));
  });
}

async function cargarMensajes(idioma) {
  const res = await fetch(`/i18n/${idioma}`, { headers: { 'x-cubo-key': localStorage.getItem('cubo_llave') || '' } });
  if (!res.ok) throw new Error('no i18n');
  const data = await res.json();
  estado.mensajes = data.mensajes;
  estado.idioma = idioma;
  aplicarTraducciones();
}

async function api(ruta, opciones = {}) {
  const llave = localStorage.getItem('cubo_llave') || '';
  const headers = { ...(opciones.headers || {}) };
  if (llave) headers['x-cubo-key'] = llave;
  if (opciones.body && typeof opciones.body === 'object' && !(opciones.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(opciones.body);
  }
  const res = await fetch(ruta, { ...opciones, headers });
  if (res.status === 401) {
    throw new Error(t('error.no_autorizado'));
  }
  const texto = await res.text();
  let json;
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error(texto.slice(0, 200));
  }
  if (!res.ok) {
    const codigo = json.error?.codigo || 'error.servidor';
    const mensaje = json.error?.mensaje || t(codigo, json.error?.detalles);
    throw new Error(mensaje);
  }
  return json;
}

async function cargarConfig() {
  const data = await api('/config-publica');
  estado.marca = data.marca;
  estado.tipografias = data.tipografias || [];
  document.getElementById('marca-nombre').textContent = data.marca?.nombre || 'Taller';
  document.getElementById('pie-version').textContent = `v${data.version}`;
  const sel = document.getElementById('select-tipografia');
  sel.innerHTML = '';
  for (const f of estado.tipografias) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.nombre} (${f.id})`;
    sel.appendChild(opt);
  }
  // estado biblioteca
  const estadoBib = document.getElementById('estado-biblioteca');
  try {
    const salud = await fetch(data.biblioteca_url + '/salud').then((r) => r.json());
    estadoBib.textContent = `Biblioteca OK (${data.biblioteca_url})`;
    estadoBib.className = 'estado-biblioteca ok';
  } catch {
    estadoBib.textContent = `Biblioteca no disponible (${data.biblioteca_url})`;
    estadoBib.className = 'estado-biblioteca error';
  }
}

async function cargarBandeja() {
  const data = await api('/bandeja');
  estado.bandeja = data.bandeja || [];
  document.getElementById('contador-bandeja').textContent = String(estado.bandeja.length);
  const lista = document.getElementById('lista-bandeja');
  const vacia = document.getElementById('msg-bandeja-vacia');
  lista.innerHTML = '';
  if (estado.bandeja.length === 0) {
    vacia.classList.remove('oculto');
    return;
  }
  vacia.classList.add('oculto');
  for (const item of estado.bandeja) {
    const div = document.createElement('div');
    div.className = 'item-bandeja';
    const mini = document.createElement('div');
    mini.className = 'mini';
    mini.textContent = t('ui.cargando');
    // cargar svg
    fetch(`/bandeja/${item.id}/archivo?inline=1`, { headers: { 'x-cubo-key': localStorage.getItem('cubo_llave') || '' } })
      .then((r) => r.text())
      .then((svg) => {
        mini.innerHTML = svg;
      })
      .catch(() => {
        mini.textContent = t('ui.sin_preview');
      });

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `
      <div><strong>${item.id}</strong> · ${item.constructor} · ${item.formato}</div>
      <div>${t('ui.ancho')}: ${item.medidas_mm?.ancho ?? '-'} mm, ${t('ui.alto')}: ${item.medidas_mm?.alto ?? '-'} mm</div>
      <div>${t('ui.largo_corte')}: ${item.largo_corte_mm ?? '-'} mm, ${t('ui.area')}: ${item.area_mm2 ?? '-'} mm²</div>
      <div class="ayuda">${item.receta?.texto ? `Texto: ${item.receta.texto} · ${item.receta.tipografia}` : ''}</div>
      <div class="ayuda">${item.creado}</div>
    `;

    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    const btnGuardar = document.createElement('button');
    btnGuardar.className = 'boton primario chico';
    btnGuardar.textContent = t('ui.guardar_produccion');
    btnGuardar.onclick = async () => {
      btnGuardar.disabled = true;
      btnGuardar.textContent = t('ui.guardando');
      try {
        await api(`/bandeja/${item.id}/guardar`, { method: 'POST' });
        await cargarBandeja();
      } catch (e) {
        alert(e.message);
        btnGuardar.disabled = false;
        btnGuardar.textContent = t('ui.guardar_produccion');
      }
    };
    const btnDescartar = document.createElement('button');
    btnDescartar.className = 'boton chico';
    btnDescartar.textContent = t('ui.descartar');
    btnDescartar.onclick = async () => {
      if (!confirm('¿Descartar?')) return;
      btnDescartar.disabled = true;
      btnDescartar.textContent = t('ui.descartando');
      try {
        await api(`/bandeja/${item.id}/descartar`, { method: 'POST' });
        await cargarBandeja();
      } catch (e) {
        alert(e.message);
        btnDescartar.disabled = false;
        btnDescartar.textContent = t('ui.descartar');
      }
    };
    acciones.appendChild(btnGuardar);
    acciones.appendChild(btnDescartar);

    div.appendChild(mini);
    div.appendChild(info);
    div.appendChild(acciones);
    lista.appendChild(div);
  }
}

async function mostrarPreview(data, msgEl, btnEl, textoOk) {
  const previewArea = document.getElementById('preview-area');
  const previewSvg = document.getElementById('preview-svg');
  estado.ultimoGenerado = data;
  previewArea.classList.remove('oculto');
  previewSvg.innerHTML = data.svg_preview || '';
  document.getElementById('medida-ancho').textContent = data.medidas_mm.ancho;
  document.getElementById('medida-alto').textContent = data.medidas_mm.alto;
  document.getElementById('medida-largo').textContent = data.largo_corte_mm;
  document.getElementById('medida-area').textContent = data.area_mm2;
  document.getElementById('debug-info').textContent = data.debug ? `Contornos: ${data.debug.num_contornos_originales} → Union: ${data.debug.num_poligonos_union} · Escala: ${data.debug.escala_mm_por_px.toFixed(4)} mm/px` : `Receta: ${JSON.stringify(data.receta)}`;
  msgEl.textContent = `${textoOk} → ${data.bandeja.id}`;
  msgEl.className = 'aviso ok';
  await cargarBandeja();
}

async function generar() {
  const texto = document.getElementById('input-texto').value.trim();
  const tipografia = document.getElementById('select-tipografia').value;
  const tamano = Number(document.getElementById('input-tamano').value);
  const msg = document.getElementById('msg-generar');
  const btn = document.getElementById('btn-generar');

  if (!texto) {
    msg.textContent = t('error.texto_vacio');
    msg.className = 'aviso error';
    return;
  }

  btn.disabled = true;
  btn.textContent = t('ui.generando');
  msg.textContent = '';
  try {
    const data = await api('/constructores/texto', {
      method: 'POST',
      body: { texto, tipografia, tamano_mm: tamano },
    });
    await mostrarPreview(data, msg, btn, 'Generado OK');
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'aviso error';
  } finally {
    btn.disabled = false;
    btn.textContent = t('ui.generar');
  }
}

async function generarCaja() {
  const ancho = Number(document.getElementById('caja-ancho').value);
  const alto = Number(document.getElementById('caja-alto').value);
  const prof = Number(document.getElementById('caja-prof').value);
  const grosor = Number(document.getElementById('caja-grosor').value);
  const tipo = document.getElementById('caja-tipo').value;
  const msg = document.getElementById('msg-caja');
  const btn = document.getElementById('btn-generar-caja');
  btn.disabled = true;
  msg.textContent = '';
  try {
    const data = await api('/constructores/caja', { method: 'POST', body: { ancho_mm: ancho, alto_mm: alto, profundidad_mm: prof, grosor_mm: grosor, tipo } });
    await mostrarPreview(data, msg, btn, 'Caja OK');
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'aviso error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generar caja';
  }
}

async function generarLlavero() {
  const texto = document.getElementById('llavero-texto').value.trim();
  const forma = document.getElementById('llavero-forma').value;
  const tam = Number(document.getElementById('llavero-tam').value);
  const tipografia = document.getElementById('select-tipografia').value;
  const msg = document.getElementById('msg-llavero');
  const btn = document.getElementById('btn-generar-llavero');
  if (!texto) { msg.textContent = 'Texto vacío'; msg.className='aviso error'; return; }
  btn.disabled = true;
  msg.textContent = '';
  try {
    const data = await api('/constructores/llavero', { method: 'POST', body: { texto, forma, tamano_mm: tam, tipografia } });
    await mostrarPreview(data, msg, btn, 'Llavero OK');
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'aviso error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generar llavero';
  }
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const idiomaParam = params.get('idioma');
  const guardado = localStorage.getItem('taller_idioma');
  const inicial = idiomaParam || guardado || 'es';
  document.getElementById('selector-idioma').value = inicial;

  // intentar cargar llave de cookie si existe
  const cookie = document.cookie.split(';').find((c) => c.trim().startsWith('cubo_llave='));
  if (cookie) {
    const val = decodeURIComponent(cookie.split('=')[1]);
    localStorage.setItem('cubo_llave', val);
  }

  try {
    await cargarMensajes(inicial);
  } catch {
    estado.mensajes = {};
  }
  try {
    await cargarConfig();
  } catch (e) {
    document.getElementById('estado-biblioteca').textContent = e.message;
  }
  await cargarBandeja();

  document.getElementById('selector-idioma').addEventListener('change', async (ev) => {
    const nuevo = ev.target.value;
    localStorage.setItem('taller_idioma', nuevo);
    await cargarMensajes(nuevo);
  });

  document.getElementById('btn-generar').addEventListener('click', generar);
  document.getElementById('input-texto').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') generar();
  });
  const btnCaja = document.getElementById('btn-generar-caja');
  if (btnCaja) btnCaja.addEventListener('click', generarCaja);
  const btnLlav = document.getElementById('btn-generar-llavero');
  if (btnLlav) btnLlav.addEventListener('click', generarLlavero);
}

init();
