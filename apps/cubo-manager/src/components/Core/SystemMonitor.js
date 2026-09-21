// Núcleo central de monitoreo y diagnóstico preventivo
// Este módulo debe ser importado en el entrypoint de la app y en los componentes críticos

class SystemMonitor {
  static instance = null;
  logs = [];
  errors = [];
  metrics = {
    renders: 0,
    lastRender: null,
    responseTimes: [],
    errorCount: 0
  };
  listeners = [];

  constructor() {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = this;
    }
    return SystemMonitor.instance;
  }

  log(event, data = {}) {
    const entry = { timestamp: Date.now(), event, data };
    this.logs.push(entry);
    this.notify('log', entry);
  }

  error(error, context = {}) {
    const entry = { timestamp: Date.now(), error, context };
    this.errors.push(entry);
    this.metrics.errorCount++;
    this.notify('error', entry);
  }

  recordMetric(metric, value) {
    if (!this.metrics[metric]) this.metrics[metric] = [];
    this.metrics[metric].push(value);
    this.notify('metric', { metric, value });
  }

  on(eventType, callback) {
    this.listeners.push({ eventType, callback });
  }

  notify(eventType, payload) {
    this.listeners.forEach(({ eventType: type, callback }) => {
      if (type === eventType) callback(payload);
    });
  }

  getStatus() {
    return {
      logs: this.logs.slice(-10),
      errors: this.errors.slice(-10),
      metrics: this.metrics
    };
  }
}

const systemMonitor = new SystemMonitor();
export default systemMonitor;
