async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.mensaje || `Error ${res.status}`);
  return data;
}

async function cargarProductos() {
  try {
    const { productos } = await api('/productos');
    document.getElementById('productos').innerHTML = productos.map(p => `<div class="card"><b>${p.nombre}</b> - ${p.tipo_venta} - $${p.precio} ${p.moneda} - ${p.estado} - activo:${p.activo_id||'none'}<br/>${p.descripcion||''}</div>`).join('') || '<i>Sin productos</i>';
  } catch(e) {
    document.getElementById('productos').textContent = 'Error: ' + e.message;
  }
}

async function cargarEntregas() {
  try {
    const { entregas } = await api('/entregas', { headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' } });
    document.getElementById('entregas').innerHTML = entregas.map(en => `<div class="card"><b>${en.id}</b> pedido ${en.pedido_id} - ${en.cliente_nombre} (${en.cliente_email}) - ${en.ubicacion}/${en.confirmacion} - <b>${en.estado}</b><br/>${en.mensaje||''}<br/>${en.enlace?`<a href="${en.enlace}" target="_blank">enlace</a>`:''}<br/><button onclick="aprobar('${en.id}')">Aprobar</button> <button onclick="enviar('${en.id}')">Enviar</button></div>`).join('') || '<i>Sin entregas</i>';
  } catch(e) {
    document.getElementById('entregas').textContent = 'Error: ' + e.message;
  }
}

window.aprobar = async (id) => {
  try {
    await api(`/entregas/${encodeURIComponent(id)}/aprobar`, { method: 'POST', headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' } });
    await cargarEntregas();
  } catch(e) { alert(e.message); }
};
window.enviar = async (id) => {
  try {
    const data = await api(`/entregas/${encodeURIComponent(id)}/enviar`, { method: 'POST', headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' } });
    alert('Enviada: ' + JSON.stringify(data.entrega));
    await cargarEntregas();
  } catch(e) { alert(e.message); }
};

document.getElementById('form-producto').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = {
    nombre: fd.get('nombre'),
    descripcion: fd.get('descripcion'),
    categoria: fd.get('categoria'),
    precio: Number(fd.get('precio')),
    tipo_venta: fd.get('tipo_venta'),
    activo_id: fd.get('activo_id')||null,
    contacto: ['whatsapp'],
    moneda: 'MXN',
  };
  try {
    await api('/productos', { method: 'POST', headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' }, body: JSON.stringify(body) });
    ev.target.reset();
    await cargarProductos();
  } catch(e) { alert(e.message); }
});

document.getElementById('form-venta').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = {
    producto_id: fd.get('producto_id')||null,
    cliente: { nombre: fd.get('cliente_nombre'), email: fd.get('cliente_email') },
    tipo_pago: fd.get('tipo_pago'),
    ubicacion: fd.get('ubicacion'),
    confirmacion: fd.get('confirmacion'),
  };
  try {
    await api('/ventas', { method: 'POST', headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' }, body: JSON.stringify(body) });
    ev.target.reset();
    await cargarEntregas();
  } catch(e) { alert(e.message); }
});

async function init() {
  try {
    const cfg = await api('/config-publica', { headers: { 'X-Cubo-Key': localStorage.getItem('cubo_key')||'' } });
    document.getElementById('estado').textContent = `Marca: ${cfg.marca.nombre} - Biblioteca: ${cfg.biblioteca_url}`;
  } catch {}
  await cargarProductos();
  await cargarEntregas();
}
init();
