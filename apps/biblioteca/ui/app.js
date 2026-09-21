/* Interfaz web local de la Biblioteca.
 * Todo texto visible sale del diccionario de traduccion del propio servicio
 * (GET /i18n/:idioma): no hay cadenas fijas en la interfaz.
 */
(() => {
  'use strict';

  const estado = {
    idioma: 'es',
    mensajes: {},
    config: null,
    filtros: {},
    activoActual: null,
  };

  const $ = (selector) => document.querySelector(selector);

  function t(clave, variables) {
    let texto = estado.mensajes[clave] ?? clave;
    if (variables) {
      for (const [nombre, valor] of Object.entries(variables)) {
        texto = texto.replaceAll(`{${nombre}}`, String(valor));
      }
    }
    return texto;
  }

  function aplicarTraducciones() {
    document.documentElement.lang = estado.idioma;
    for (const nodo of document.querySelectorAll('[data-i18n]')) {
      nodo.textContent = t(nodo.dataset.i18n);
    }
    for (const nodo of document.querySelectorAll('[data-i18n-placeholder]')) {
      nodo.setAttribute('placeholder', t(nodo.dataset.i18nPlaceholder));
    }
    document.title = `${estado.config?.marca?.nombre ?? t('ui.titulo')} · ${t('ui.titulo')}`;
    const nombre = $('#marca-nombre');
    if (nombre && estado.config) nombre.textContent = estado.config.marca?.nombre ?? t('ui.titulo');
    const version = $('#pie-version');
    if (version && estado.config) version.textContent = `v${estado.config.version}`;
  }

  function aplicarMarca() {
    const colores = estado.config?.marca?.colores;
    if (!colores) return;
    const raiz = document.documentElement;
    if (colores.primario) raiz.style.setProperty('--primario', colores.primario);
    if (colores.fondo) raiz.style.setProperty('--fondo', colores.fondo);
    if (colores.texto) raiz.style.setProperty('--texto', colores.texto);
  }

  async function peticion(ruta, opciones = {}) {
    const respuesta = await fetch(ruta, {
      credentials: 'same-origin',
      ...opciones,
      headers: { ...(opciones.headers ?? {}) },
    });
    const tipo = respuesta.headers.get('content-type') ?? '';
    const cuerpo = tipo.includes('application/json') ? await respuesta.json() : await respuesta.text();
    if (!respuesta.ok) {
      const codigo = cuerpo?.error?.codigo ?? 'error.servidor';
      const error = new Error(cuerpo?.error?.mensaje ?? t(codigo));
      error.codigo = codigo;
      error.estado = respuesta.status;
      throw error;
    }
    return cuerpo;
  }

  function opcionesDe(select, valores, prefijo, incluirTodos) {
    select.innerHTML = '';
    if (incluirTodos) {
      const opcion = document.createElement('option');
      opcion.value = '';
      opcion.textContent = t('ui.todos');
      select.appendChild(opcion);
    }
    for (const valor of valores) {
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = t(`${prefijo}.${valor}`);
      select.appendChild(opcion);
    }
  }

  async function cargarCategorias() {
    const datos = await peticion('/categorias');
    opcionesDe($('#filtro-categoria'), datos.categorias.map((c) => c.categoria).filter(Boolean), 'ui.categoria', true);
  }

  async function buscar() {
    const parametros = new URLSearchParams();
    const q = $('#buscador').value.trim();
    if (q) parametros.set('q', q);
    for (const [clave, selector] of [
      ['tipo', '#filtro-tipo'],
      ['espacio', '#filtro-espacio'],
      ['categoria', '#filtro-categoria'],
      ['licencia', '#filtro-licencia'],
    ]) {
      const valor = $(selector).value;
      if (valor) parametros.set(clave, valor);
    }
    if ($('#filtro-vendible').checked) parametros.set('vendible_digital', '1');
    parametros.set('limite', '96');

    const datos = await peticion(`/activos?${parametros.toString()}`);
    estado.filtros = Object.fromEntries(parametros.entries());
    pintarContador(datos.total);
    pintarCuadricula(datos.activos);
  }

  function pintarContador(total) {
    const contador = $('#contador');
    if (total === 0) contador.textContent = t('ui.resultados_cero');
    else if (total === 1) contador.textContent = t('ui.resultados_uno');
    else contador.textContent = t('ui.resultados', { total });
  }

  function pintarCuadricula(activos) {
    const cuadricula = $('#cuadricula');
    cuadricula.innerHTML = '';
    if (activos.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'ayuda';
      vacio.textContent = t('ui.sin_resultados');
      cuadricula.appendChild(vacio);
      return;
    }
    for (const activo of activos) {
      const tarjeta = document.createElement('article');
      tarjeta.className = 'tarjeta';
      tarjeta.tabIndex = 0;

      if (activo.miniatura) {
        const imagen = document.createElement('img');
        imagen.loading = 'lazy';
        imagen.src = activo.miniatura;
        imagen.alt = activo.nombre;
        tarjeta.appendChild(imagen);
      } else {
        const hueco = document.createElement('div');
        hueco.className = 'sin-miniatura';
        hueco.textContent = `${t('ui.miniatura_no_disponible')}${activo.formato_principal ? ` · ${activo.formato_principal}` : ''}`;
        tarjeta.appendChild(hueco);
      }

      const datos = document.createElement('div');
      datos.className = 'datos';
      const nombre = document.createElement('div');
      nombre.className = 'nombre';
      nombre.textContent = activo.nombre;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const insignia = document.createElement('span');
      insignia.className = `insignia ${activo.espacio === 'trabajo' ? 'trabajo' : ''}`;
      insignia.textContent = t(`ui.espacio.${activo.espacio}`);
      meta.appendChild(insignia);
      meta.append(` ${t(`ui.tipo.${activo.tipo}`)}${activo.categoria ? ` · ${activo.categoria}` : ''}`);
      datos.append(nombre, meta);
      tarjeta.appendChild(datos);

      tarjeta.addEventListener('click', () => abrirFicha(activo.id));
      tarjeta.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') abrirFicha(activo.id);
      });
      cuadricula.appendChild(tarjeta);
    }
  }

  function campo(nombre, valor) {
    const dt = document.createElement('dt');
    dt.textContent = t(nombre);
    const dd = document.createElement('dd');
    dd.textContent = valor ?? '—';
    return [dt, dd];
  }

  async function abrirFicha(id) {
    const panel = $('#panel-ficha');
    panel.classList.remove('oculto');
    panel.setAttribute('aria-hidden', 'false');
    panel.innerHTML = `<p>${t('ui.cargando')}</p>`;
    let datos;
    try {
      datos = await peticion(`/activos/${encodeURIComponent(id)}`);
    } catch (error) {
      panel.innerHTML = `<p class="aviso error">${error.message}</p>`;
      return;
    }
    estado.activoActual = datos;
    panel.innerHTML = '';

    const cerrar = document.createElement('button');
    cerrar.className = 'boton discreto';
    cerrar.textContent = t('ui.cerrar');
    cerrar.addEventListener('click', cerrarFicha);
    panel.appendChild(cerrar);

    const titulo = document.createElement('h2');
    titulo.textContent = datos.nombre;
    panel.appendChild(titulo);

    if (datos.imagenes.length > 0) {
      const imagen = document.createElement('img');
      imagen.className = 'miniatura';
      imagen.src = `/activos/${encodeURIComponent(datos.id)}/miniatura`;
      imagen.alt = datos.nombre;
      panel.appendChild(imagen);
    }

    const lista = document.createElement('dl');
    const medidas = [datos.medidas_mm.ancho, datos.medidas_mm.alto, datos.medidas_mm.profundidad]
      .filter((v) => v !== null && v !== undefined)
      .join(' × ');
    for (const [clave, valor] of [
      ['ui.tipo', t(`ui.tipo.${datos.tipo}`)],
      ['ui.espacio', t(`ui.espacio.${datos.espacio}`)],
      ['ui.categoria', datos.categoria],
      ['ui.etiquetas', datos.etiquetas.join(', ')],
      ['ui.medidas', medidas],
      ['ui.material', datos.material],
      ['ui.origen', datos.origen],
      ['ui.licencia', t(`ui.licencia.${datos.licencia}`)],
      ['ui.vendible_digital', datos.vendible_digital ? '✓' : '—'],
      ['ui.ubicacion', t(`ui.ubicacion.${datos.ubicacion_almacen}`)],
      ['ui.creado', datos.creado],
      ['ui.notas', datos.notas],
    ]) {
      const [dt, dd] = campo(clave, valor);
      lista.append(dt, dd);
    }
    if (datos.original_id) {
      const [dt, dd] = campo('ui.enlace_original', datos.original_id);
      lista.append(dt, dd);
    }
    panel.appendChild(lista);

    if (datos.espacio === 'original') {
      const aviso = document.createElement('p');
      aviso.className = 'ayuda';
      aviso.textContent = t('ui.solo_lectura');
      panel.appendChild(aviso);
    }

    const seccionArchivos = document.createElement('h3');
    seccionArchivos.textContent = t('ui.archivos');
    panel.appendChild(seccionArchivos);
    for (const archivo of datos.archivos) {
      const fila = document.createElement('div');
      fila.className = 'archivo';
      const nombre = document.createElement('span');
      nombre.textContent = archivo.ruta_relativa.split('/').pop();
      const acciones = document.createElement('span');
      const abrir = document.createElement('a');
      abrir.className = 'boton discreto';
      abrir.textContent = t('ui.abrir');
      abrir.href = `/activos/${encodeURIComponent(datos.id)}/archivo?inline=1&ruta=${encodeURIComponent(archivo.ruta_relativa)}`;
      abrir.target = '_blank';
      abrir.rel = 'noopener';
      const descargar = document.createElement('a');
      descargar.className = 'boton';
      descargar.textContent = t('ui.descargar');
      descargar.href = `/activos/${encodeURIComponent(datos.id)}/archivo?ruta=${encodeURIComponent(archivo.ruta_relativa)}`;
      acciones.append(abrir, ' ', descargar);
      fila.append(nombre, acciones);
      panel.appendChild(fila);
    }

    if (datos.imagenes.length > 0) {
      const seccionImagenes = document.createElement('h3');
      seccionImagenes.textContent = t('ui.imagenes');
      panel.appendChild(seccionImagenes);
      datos.imagenes.forEach((imagen, indice) => {
        const fila = document.createElement('div');
        fila.className = 'archivo';
        fila.textContent = `${imagen.ruta_relativa.split('/').pop()} · ${t(`ui.origen_imagen.${imagen.origen_imagen}`)}`;
        const enlace = document.createElement('a');
        enlace.className = 'boton discreto';
        enlace.textContent = t('ui.abrir');
        enlace.href = `/activos/${encodeURIComponent(datos.id)}/miniatura?indice=${indice}`;
        enlace.target = '_blank';
        enlace.rel = 'noopener';
        fila.append(' ', enlace);
        panel.appendChild(fila);
      });
    }

    if (datos.trabajos && datos.trabajos.length > 0) {
      const seccionTrabajos = document.createElement('h3');
      seccionTrabajos.textContent = t('ui.trabajos_derivados');
      panel.appendChild(seccionTrabajos);
      for (const trabajo of datos.trabajos) {
        const boton = document.createElement('button');
        boton.className = 'boton discreto';
        boton.textContent = `${trabajo.id} · ${trabajo.nombre}`;
        boton.addEventListener('click', () => abrirFicha(trabajo.id));
        panel.appendChild(boton);
      }
    }

    panel.appendChild(formularioEdicion(datos));

    const botonTrabajo = document.createElement('button');
    botonTrabajo.className = 'boton primario';
    botonTrabajo.textContent = t('ui.crear_trabajo');
    botonTrabajo.style.marginTop = '0.8rem';
    botonTrabajo.addEventListener('click', async () => {
      try {
        const creado = await peticion(`/activos/${encodeURIComponent(datos.id)}/trabajo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        await buscar();
        await abrirFicha(creado.activo.id);
      } catch (error) {
        window.alert(error.message);
      }
    });
    panel.appendChild(botonTrabajo);
  }

  function formularioEdicion(datos) {
    const contenedor = document.createElement('div');
    contenedor.style.marginTop = '1rem';
    const titulo = document.createElement('h3');
    titulo.textContent = t('ui.editar');
    contenedor.appendChild(titulo);

    const campos = [
      ['nombre', datos.nombre, 'text'],
      ['categoria', datos.categoria ?? '', 'text'],
      ['etiquetas', datos.etiquetas.join(', '), 'text'],
      ['material', datos.material ?? '', 'text'],
      ['origen', datos.origen, 'text'],
      ['notas', datos.notas ?? '', 'text'],
    ];
    const entradas = {};
    for (const [nombre, valor, tipo] of campos) {
      const etiqueta = document.createElement('label');
      const texto = document.createElement('span');
      texto.textContent = t(`ui.${nombre}`);
      const entrada = document.createElement('input');
      entrada.type = tipo;
      entrada.value = valor;
      etiqueta.append(texto, entrada);
      contenedor.appendChild(etiqueta);
      entradas[nombre] = entrada;
    }

    const etiquetaLicencia = document.createElement('label');
    const textoLicencia = document.createElement('span');
    textoLicencia.textContent = t('ui.licencia');
    const licencia = document.createElement('select');
    for (const valor of estado.config.licencias) {
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = t(`ui.licencia.${valor}`);
      if (valor === datos.licencia) opcion.selected = true;
      licencia.appendChild(opcion);
    }
    etiquetaLicencia.append(textoLicencia, licencia);
    contenedor.appendChild(etiquetaLicencia);

    const etiquetaVendible = document.createElement('label');
    etiquetaVendible.className = 'campo-inline';
    const vendible = document.createElement('input');
    vendible.type = 'checkbox';
    vendible.checked = datos.vendible_digital;
    const textoVendible = document.createElement('span');
    textoVendible.textContent = t('ui.vendible_digital');
    etiquetaVendible.append(vendible, textoVendible);
    contenedor.appendChild(etiquetaVendible);

    const aviso = document.createElement('p');
    aviso.className = 'aviso';
    contenedor.appendChild(aviso);

    const guardar = document.createElement('button');
    guardar.className = 'boton primario';
    guardar.textContent = t('ui.guardar');
    guardar.addEventListener('click', async () => {
      aviso.className = 'aviso';
      aviso.textContent = '';
      const cambios = {
        nombre: entradas.nombre.value,
        categoria: entradas.categoria.value,
        etiquetas: entradas.etiquetas.value,
        material: entradas.material.value,
        origen: entradas.origen.value,
        notas: entradas.notas.value,
        licencia: licencia.value,
        vendible_digital: vendible.checked,
      };
      try {
        await peticion(`/activos/${encodeURIComponent(datos.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cambios),
        });
        await cargarCategorias();
        await buscar();
        await abrirFicha(datos.id);
      } catch (error) {
        aviso.className = 'aviso error';
        aviso.textContent = error.message;
      }
    });
    contenedor.appendChild(guardar);
    return contenedor;
  }

  function cerrarFicha() {
    const panel = $('#panel-ficha');
    panel.classList.add('oculto');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '';
    estado.activoActual = null;
  }

  function prepararFormularioAlta() {
    const formulario = $('#form-alta');
    opcionesDe(formulario.querySelector('[name=tipo]'), estado.config.tipos, 'ui.tipo', false);
    opcionesDe(formulario.querySelector('[name=licencia]'), estado.config.licencias, 'ui.licencia', false);
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const aviso = $('#resultado-alta');
      aviso.className = 'aviso';
      aviso.textContent = '';
      const datos = new FormData(formulario);
      const archivos = formulario.querySelector('[name=archivos]').files;
      const imagen = formulario.querySelector('[name=imagen]').files[0];
      const cuerpo = new FormData();
      for (const [clave, valor] of datos.entries()) {
        if (clave === 'archivos' || clave === 'imagen') continue;
        if (valor === '' || valor === null) continue;
        cuerpo.append(clave, valor);
      }
      cuerpo.set('espacio', 'original');
      for (const archivo of archivos) cuerpo.append('archivo', archivo);
      if (imagen) cuerpo.append('imagen', imagen);

      if (archivos.length === 0 && !imagen) {
        aviso.className = 'aviso error';
        aviso.textContent = t('error.alta_sin_archivo');
        return;
      }
      try {
        const resultado = await peticion('/activos', { method: 'POST', body: cuerpo });
        aviso.className = 'aviso ok';
        aviso.textContent =
          t('ui.alta.ok') +
          (resultado.avisos.length > 0 ? ` ${resultado.avisos.map((a) => a.mensaje).join(' · ')}` : '');
        formulario.reset();
        await cargarCategorias();
        await buscar();
      } catch (error) {
        aviso.className = 'aviso error';
        aviso.textContent = error.message;
      }
    });
  }

  function prepararFormularioImportar() {
    const formulario = $('#form-importar');
    opcionesDe(formulario.querySelector('[name=licencia]'), estado.config.licencias, 'ui.licencia', false);
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const contenedor = $('#resultado-importar');
      contenedor.innerHTML = `<p>${t('ui.cargando')}</p>`;
      const datos = new FormData(formulario);
      const cuerpo = {
        ruta: datos.get('ruta'),
        usar_carpeta_como_categoria: true,
      };
      for (const clave of ['categoria', 'licencia', 'origen']) {
        const valor = datos.get(clave);
        if (valor) cuerpo[clave] = valor;
      }
      try {
        const informe = await peticion('/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
        });
        pintarInforme(contenedor, informe);
        await cargarCategorias();
        await buscar();
      } catch (error) {
        contenedor.innerHTML = `<p class="aviso error">${error.message}</p>`;
      }
    });
  }

  function pintarInforme(contenedor, informe) {
    contenedor.innerHTML = '';
    const titulo = document.createElement('h3');
    titulo.textContent = t('ui.informe.titulo');
    contenedor.appendChild(titulo);
    const tabla = document.createElement('table');
    const filas = [
      ['ui.informe.escaneados', informe.escaneados],
      ['ui.informe.nuevos', informe.nuevos.length],
      ['ui.informe.duplicados', informe.duplicados.length],
      ['ui.informe.errores', informe.errores.length],
      ['ui.informe.omitidos', informe.omitidos.length],
      ['ui.informe.sin_miniatura', informe.sin_miniatura],
      ['ui.informe.duracion', `${informe.duracion_ms} ms`],
    ];
    for (const [clave, valor] of filas) {
      const fila = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = t(clave);
      const td = document.createElement('td');
      td.textContent = String(valor);
      fila.append(th, td);
      tabla.appendChild(fila);
    }
    contenedor.appendChild(tabla);

    const listar = (titulo2, elementos, formato) => {
      if (elementos.length === 0) return;
      const encabezado = document.createElement('p');
      encabezado.textContent = titulo2;
      contenedor.appendChild(encabezado);
      const lista = document.createElement('ul');
      for (const elemento of elementos.slice(0, 20)) {
        const item = document.createElement('li');
        item.textContent = formato(elemento);
        lista.appendChild(item);
      }
      contenedor.appendChild(lista);
    };
    listar(t('ui.informe.duplicados'), informe.duplicados, (d) => `${d.ruta} → ${d.activo_existente ?? '?'}`);
    listar(t('ui.informe.errores'), informe.errores, (e) => `${e.ruta}: ${t(e.motivo)}`);
    listar(t('ui.informe.omitidos'), informe.omitidos, (e) => `${e.ruta}: ${t(e.motivo)}`);
  }

  async function cambiarIdioma(idioma) {
    const datos = await peticion(`/i18n/${idioma}`);
    estado.idioma = idioma;
    estado.mensajes = datos.mensajes;
    aplicarTraducciones();
    opcionesDe($('#filtro-tipo'), estado.config.tipos, 'ui.tipo', true);
    opcionesDe($('#filtro-espacio'), estado.config.espacios, 'ui.espacio', true);
    opcionesDe($('#filtro-licencia'), estado.config.licencias, 'ui.licencia', true);
    await cargarCategorias();
    await buscar();
  }

  async function iniciar() {
    const config = await peticion('/config-publica');
    estado.config = config;
    $('#selector-idioma').value = config.idioma;
    aplicarMarca();
    prepararFormularioAlta();
    prepararFormularioImportar();

    $('#selector-idioma').addEventListener('change', (evento) => cambiarIdioma(evento.target.value));
    $('#boton-buscar').addEventListener('click', buscar);
    $('#buscador').addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') buscar();
    });
    $('#filtro-vendible').addEventListener('change', buscar);
    for (const selector of ['#filtro-tipo', '#filtro-espacio', '#filtro-categoria', '#filtro-licencia']) {
      $(selector).addEventListener('change', buscar);
    }
    $('#boton-limpiar').addEventListener('click', () => {
      $('#buscador').value = '';
      $('#filtro-vendible').checked = false;
      for (const selector of ['#filtro-tipo', '#filtro-espacio', '#filtro-categoria', '#filtro-licencia']) {
        $(selector).value = '';
      }
      buscar();
    });
    $('#boton-alta').addEventListener('click', () => $('#dialogo-alta').showModal());
    $('#boton-importar').addEventListener('click', () => $('#dialogo-importar').showModal());
    for (const boton of document.querySelectorAll('[data-cerrar]')) {
      boton.addEventListener('click', () => document.getElementById(boton.dataset.cerrar).close());
    }
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') cerrarFicha();
    });

    await cambiarIdioma(config.idioma);
  }

  iniciar().catch((error) => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<p class="aviso error" style="padding:1rem">${error?.message ?? 'error'}</p>`,
    );
  });
})();
