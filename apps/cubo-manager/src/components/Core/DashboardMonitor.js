import React, { useEffect, useState } from 'react';
import systemMonitor from '../Core/SystemMonitor';

const DashboardMonitor = () => {
  const [status, setStatus] = useState(systemMonitor.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(systemMonitor.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: '#18181b', color: '#fff', padding: 16, borderRadius: 8, maxWidth: 420, fontSize: 14 }}>
      <h3 style={{ color: '#39ff14', marginBottom: 8 }}>🛡️ Monitor Interno</h3>
      <div><b>Últimos logs:</b>
        <ul>{status.logs.map((log, i) => <li key={i}>{new Date(log.timestamp).toLocaleTimeString()} - {log.event}</li>)}</ul>
      </div>
      <div><b>Errores recientes:</b>
        <ul>{status.errors.map((err, i) => <li key={i}>{new Date(err.timestamp).toLocaleTimeString()} - {err.error?.toString?.() || 'Error'}</li>)}</ul>
      </div>
      <div><b>Métricas:</b>
        <pre style={{ background: '#222', color: '#39ff14', padding: 8, borderRadius: 4 }}>{JSON.stringify(status.metrics, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DashboardMonitor;
