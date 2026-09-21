import React, { useState, useEffect } from 'react';
import ModuleHub from './ModuleHub';
import './DashboardMain.css';

const DashboardMain = () => {
  const [stats, setStats] = useState({
    ventasHoy: 0,
    ventasMes: 0,
    trabajosEnCola: 0,
    trabajosEnProceso: 0,
    trabajosTerminados: 0,
    stockBajo: 0,
    sinStock: 0,
    cotizacionesPendientes: 0,
    gananciaMes: 0,
    balance: 0
  });
  const [eventosHoy, setEventosHoy] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [trabajosActivos, setTrabajosActivos] = useState([]);
  const [alertasStock, setAlertasStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('semana');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [periodo]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Cargar estadísticas en paralelo
      const [
        resumenFinanzas,
        trabajos,
        cotizaciones,
        alertas,
        eventos,
        ventas,
        productos
      ] = await Promise.all([
        window.electron.finanzas.getResumen(periodo),
        window.electron.trabajos.getAll(),
        window.electron.cotizaciones.getAll(),
        window.electron.inventario.getAlertasStock(),
        window.electron.calendario.getEventosHoy(),
        window.electron.ventas.getAll(),
        window.electron.inventario.getAll()
      ]);

      // Calcular ventas del mes (últimos 30 días)
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const ventasRecientesData = (ventas || [])
        .filter(v => new Date(v.fecha) >= inicioMes)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);

      const ventasTotalesMes = (ventas || [])
        .filter(v => new Date(v.fecha) >= inicioMes)
        .reduce((sum, v) => sum + (v.total || 0), 0);
      
      // Calcular ventas de hoy
      const hoyInicio = new Date();
      hoyInicio.setHours(0, 0, 0, 0);
      const ventasHoyTotal = (ventas || [])
        .filter(v => new Date(v.fecha) >= hoyInicio)
        .reduce((sum, v) => sum + (v.total || 0), 0);

      // Estadísticas de trabajos
      const trabajosData = trabajos || [];
      const enCola = trabajosData.filter(t => t.estado === 'en_cola').length;
      const enProceso = trabajosData.filter(t => t.estado === 'en_proceso').length;
      const terminados = trabajosData.filter(t => t.estado === 'terminado').length;

      // Trabajos activos (en cola o en proceso) - últimos 5
      const trabajosActivosData = trabajosData
        .filter(t => t.estado === 'en_cola' || t.estado === 'en_proceso')
        .slice(0, 5);

      // Cotizaciones pendientes
      const cotizacionesPendientes = (cotizaciones || []).filter(c => c.estado === 'pendiente').length;

      // Stock bajo
      const alertasData = alertas || [];
      const sinStockData = (productos || []).filter(p => p.cantidad <= 0).length;

      setStats({
        ventasHoy: ventasHoyTotal,
        ventasMes: ventasTotalesMes,
        trabajosEnCola: enCola,
        trabajosEnProceso: enProceso,
        trabajosTerminados: terminados,
        stockBajo: alertasData.length,
        sinStock: sinStockData,
        cotizacionesPendientes: cotizacionesPendientes,
        gananciaMes: resumenFinanzas?.balance || 0,
        balance: resumenFinanzas?.balance || 0
      });

      setEventosHoy(eventos || []);
      setVentasRecientes(ventasRecientesData);
      setTrabajosActivos(trabajosActivosData);
      setAlertasStock(alertasData.slice(0, 5));

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
  };

  if (loading) {
    return <div className="loading">Cargando dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <div className="periodo-selector">
          <button className={periodo === 'dia' ? 'active' : ''} onClick={() => setPeriodo('dia')}>Hoy</button>
          <button className={periodo === 'semana' ? 'active' : ''} onClick={() => setPeriodo('semana')}>Semana</button>
          <button className={periodo === 'mes' ? 'active' : ''} onClick={() => setPeriodo('mes')}>Mes</button>
          <button className={periodo === 'año' ? 'active' : ''} onClick={() => setPeriodo('año')}>Año</button>
        </div>
      </div>

      <ModuleHub />

      {/* Tarjetas de KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card ventas">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info">
            <span className="kpi-valor">{formatCurrency(stats.ventasHoy)}</span>
            <span className="kpi-label">Ventas hoy</span>
          </div>
        </div>
        <div className="kpi-card ventas-mes">
          <div className="kpi-icon">📈</div>
          <div className="kpi-info">
            <span className="kpi-valor">{formatCurrency(stats.ventasMes)}</span>
            <span className="kpi-label">Ventas del mes</span>
          </div>
        </div>
        <div className="kpi-card ganancia">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-info">
            <span className="kpi-valor">{formatCurrency(stats.gananciaMes)}</span>
            <span className="kpi-label">Ganancia neta</span>
          </div>
        </div>
        <div className="kpi-card cola">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-info">
            <span className="kpi-valor">{stats.trabajosEnCola}</span>
            <span className="kpi-label">En cola</span>
          </div>
        </div>
        <div className="kpi-card proceso">
          <div className="kpi-icon">🔧</div>
          <div className="kpi-info">
            <span className="kpi-valor">{stats.trabajosEnProceso}</span>
            <span className="kpi-label">En proceso</span>
          </div>
        </div>
        <div className="kpi-card cotizaciones">
          <div className="kpi-icon">📝</div>
          <div className="kpi-info">
            <span className="kpi-valor">{stats.cotizacionesPendientes}</span>
            <span className="kpi-label">Cotizaciones pendientes</span>
          </div>
        </div>
      </div>

      {/* Alertas de stock */}
      {alertasStock.length > 0 && (
        <div className="alertas-section">
          <h3>⚠️ Alertas de stock bajo</h3>
          <div className="alertas-lista">
            {alertasStock.map(alert => (
              <div key={alert.id} className="alerta-item">
                <span className="alerta-nombre">{alert.nombre}</span>
                <span className="alerta-cantidad">Stock: {alert.cantidad} {alert.unidad}</span>
                <span className="alerta-minimo">Mínimo: {alert.stock_minimo}</span>
                <button onClick={() => window.location.href = '/warehouse'} className="alerta-btn">Reabastecer</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección de dos columnas */}
      <div className="dashboard-two-columns">
        
        {/* Eventos de hoy */}
        <div className="dashboard-card">
          <h3>📅 Agenda de hoy</h3>
          <div className="eventos-lista">
            {eventosHoy.length === 0 ? (
              <p className="empty-text">No hay eventos programados para hoy</p>
            ) : (
              eventosHoy.map(evento => (
                <div key={evento.id} className="evento-card">
                  <div className="evento-hora">
                    {new Date(evento.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="evento-info">
                    <div className="evento-titulo">{evento.titulo}</div>
                    {evento.descripcion && <div className="evento-descripcion">{evento.descripcion}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ventas recientes */}
        <div className="dashboard-card">
          <h3>🛒 Ventas recientes</h3>
          <div className="ventas-lista">
            {ventasRecientes.length === 0 ? (
              <p className="empty-text">No hay ventas recientes</p>
            ) : (
              ventasRecientes.map(venta => (
                <div key={venta.id} className="venta-card">
                  <div className="venta-info">
                    <span className="venta-cliente">{venta.cliente_nombre || 'Cliente'}</span>
                    <span className="venta-folio">{venta.folio}</span>
                  </div>
                  <div className="venta-total">{formatCurrency(venta.total)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trabajos activos */}
      <div className="dashboard-card full-width">
        <h3>🔧 Trabajos activos</h3>
        <div className="trabajos-lista">
          {trabajosActivos.length === 0 ? (
            <p className="empty-text">No hay trabajos activos</p>
          ) : (
            <table className="trabajos-table">
              <thead>
                <tr>
                  <th>Trabajo</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Entrega</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {trabajosActivos.map(trabajo => (
                  <tr key={trabajo.id}>
                    <td className="trabajo-numero">{trabajo.numero_trabajo}</td>
                    <td>{trabajo.cliente_nombre}</td>
                    <td>
                      <span className={`estado-badge ${trabajo.estado}`}>
                        {trabajo.estado === 'en_cola' ? '⏳ En cola' : '🔧 En proceso'}
                      </span>
                    </td>
                    <td>{trabajo.fecha_entrega_estimada ? new Date(trabajo.fecha_entrega_estimada).toLocaleDateString() : '-'}</td>
                    <td>
                      <button className="ver-btn" onClick={() => window.location.href = '/production'}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="quick-access">
        <h3>⚡ Accesos rápidos</h3>
        <div className="quick-buttons">
          <button onClick={() => window.location.href = '/quotations'} className="quick-btn">📝 Nueva Cotización</button>
          <button onClick={() => window.location.href = '/production'} className="quick-btn">🔧 Nuevo Trabajo</button>
          <button onClick={() => window.location.href = '/warehouse'} className="quick-btn">📦 Agregar Stock</button>
          <button onClick={() => window.location.href = '/customers'} className="quick-btn">👥 Nuevo Cliente</button>
          <button onClick={() => window.location.href = '/sales'} className="quick-btn">💰 Registrar Venta</button>
          <button onClick={() => window.location.href = '/finance'} className="quick-btn">➖ Registrar Gasto</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMain;
