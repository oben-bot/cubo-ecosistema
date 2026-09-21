import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import './Asistant.css';
import { useNavigate } from 'react-router-dom';
import systemMonitor from '../Core/SystemMonitor';

const defaultMessages = [
  { text: "Hola, soy tu asistente Sharpy. ¿En qué puedo ayudarte hoy?", sender: 'ia' }
];

// --- INICIO CAMBIO: Chatbot Harviz profesional ---
const KNOWLEDGE_BASE_KEY = 'harviz_knowledge_base_v1';
const MEMORY_KEY = 'harviz_memory_v1';

// Base de conocimiento inicial (puede crecer con autoaprendizaje)
const initialKnowledge = [
  { keywords: ['finanzas', 'gasto', 'ingreso', 'balance'], response: 'Puedo ayudarte a consultar tus finanzas, registrar un gasto o ingreso, y mostrar balances. ¿Qué deseas hacer?' },
  { keywords: ['almacén', 'stock', 'material', 'inventario'], response: '¿Quieres ver el stock de materiales, actualizar precios o consultar el inventario?' },
  { keywords: ['clientes', 'cliente', 'contacto'], response: 'Puedo mostrarte la lista de clientes, registrar uno nuevo o buscar información de contacto. ¿Qué necesitas?' },
  { keywords: ['cotización', 'presupuesto', 'historial'], response: '¿Deseas crear una nueva cotización o consultar el historial de presupuestos?' },
  { keywords: ['trabajo', 'producción', 'cola', 'actual'], response: '¿Te gustaría ver la cola de trabajos, el trabajo actual o el resumen financiero?' },
  { keywords: ['ventas', 'web', 'pedido'], response: '¿Quieres acceder a Ventas Web, ver el carrito o enviar un pedido?' },
  { keywords: ['dashboard', 'panel', 'inicio'], response: 'Te llevo al panel principal. ¿Deseas ver el monitoreo o las métricas?' },
  { keywords: ['ayuda', 'comando', 'qué puedes hacer'], response: 'Puedo navegar por la app, consultar datos, registrar información y aprender de tus preguntas. Prueba: "abre finanzas", "registra gasto", "muéstrame clientes".' },
];

// Cargar base de conocimiento y memoria
function loadKnowledge() {
  try {
    const kb = JSON.parse(localStorage.getItem(KNOWLEDGE_BASE_KEY));
    return Array.isArray(kb) ? kb : initialKnowledge;
  } catch { return initialKnowledge; }
}
function saveKnowledge(kb) {
  localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(kb));
}
function loadMemory() {
  try {
    const mem = JSON.parse(localStorage.getItem(MEMORY_KEY));
    return Array.isArray(mem) ? mem : [];
  } catch { return []; }
}
function saveMemory(mem) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

// --- Chatbot Harviz ---
const Assistant = ({ visible, onOpen, onClose, reminderMessage, onReminderAction }) => {
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState('');
  const [pos, setPos] = useState({ x: 32, y: 32 });
  const [drag, setDrag] = useState(null); // null o {x, y, type}
  const [size, setSize] = useState({ width: 400, height: 420 });
  const [fabPos, setFabPos] = useState(() => {
    // Permitir que el botón recuerde su posición
    const saved = localStorage.getItem('assistantFabPos');
    return saved ? JSON.parse(saved) : { x: 32, y: 32 };
  });
  const fabDrag = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const dragRef = useRef(drag);
  React.useEffect(() => { dragRef.current = drag; }, [drag]);

  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('assistant_render', { visible });
  }, [visible]);

  // Drag & Drop para ventana y botón flotante
  // Handler dedicado para el header de la ventana
  const onHeaderMouseDown = (e) => {
    if (e.button !== 0) return;
    setDrag({
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
      type: 'window',
    });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Mover ventana IA al arrastrar el header (usando dragRef)
  const onMouseMove = (e) => {
    const dragData = dragRef.current;
    if (!dragData || dragData.type !== 'window') return;
    setPos({
      x: Math.max(0, e.clientX - dragData.offsetX),
      y: Math.max(0, e.clientY - dragData.offsetY)
    });
  };
  const onMouseUp = () => {
    setDrag(null);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Drag para el botón flotante
  const onFabMouseDown = (e) => {
    if (e.button !== 0) return;
    fabDrag.current = {
      offsetX: e.clientX - (fabPos?.x ?? 0),
      offsetY: e.clientY - (fabPos?.y ?? 0),
    };
    const moveHandler = (ev) => {
      if (!fabDrag.current) return;
      const newPos = {
        x: Math.max(0, ev.clientX - fabDrag.current.offsetX),
        y: Math.max(0, ev.clientY - fabDrag.current.offsetY)
      };
      localStorage.setItem('assistantFabPos', JSON.stringify(newPos));
      setFabPos(newPos);
    };
    const upHandler = () => {
      fabDrag.current = null;
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  };

  // Redimensionar desde cualquier borde/corner
  const [resizeDir, setResizeDir] = useState(null);
  const onResizeHandleDown = (dir) => (e) => {
    e.stopPropagation();
    setResizeDir({
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startPos: { ...pos }
    });
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
  };
  const onResizeMove = (e) => {
    if (!resizeDir) return;
    let newWidth = resizeDir.startWidth;
    let newHeight = resizeDir.startHeight;
    let newPos = { ...pos };
    if (resizeDir.dir.includes('right')) {
      newWidth = Math.max(320, resizeDir.startWidth + (e.clientX - resizeDir.startX));
    }
    if (resizeDir.dir.includes('bottom')) {
      newHeight = Math.max(280, resizeDir.startHeight + (e.clientY - resizeDir.startY));
    }
    if (resizeDir.dir.includes('left')) {
      const delta = e.clientX - resizeDir.startX;
      newWidth = Math.max(320, resizeDir.startWidth - delta);
      newPos.x = Math.max(0, resizeDir.startPos.x - (newWidth - resizeDir.startWidth));
    }
    if (resizeDir.dir.includes('top')) {
      const delta = e.clientY - resizeDir.startY;
      newHeight = Math.max(280, resizeDir.startHeight - delta);
      newPos.y = Math.max(0, resizeDir.startPos.y - (newHeight - resizeDir.startHeight));
    }
    setSize({ width: newWidth, height: newHeight });
    setPos(newPos);
  };
  const onResizeUp = () => {
    setResizeDir(null);
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
  };

  // --- INICIO CAMBIO: Chatbot modular y placeholder para IA futura ---
  // El siguiente bloque reemplaza la IA simple por un chatbot modular, preparado para memoria y aprendizaje.
  // El código de "Abrir Página Web Interna" queda abierto para futuras integraciones.

  // ChatbotState: almacena historial y contexto para aprendizaje futuro
  const [chatbotState, setChatbotState] = useState({
    history: [...defaultMessages],
    context: {},
  });
  const [knowledge, setKnowledge] = useState(loadKnowledge());
  const [memory, setMemory] = useState(loadMemory());
  const [showPosponer, setShowPosponer] = useState(false);
  const [posponerEvent, setPosponerEvent] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState('medio');

  // Guardar memoria y conocimiento al cambiar
  useEffect(() => { saveKnowledge(knowledge); }, [knowledge]);
  useEffect(() => { saveMemory(memory); }, [memory]);

  // Procesador de comandos y comprensión
  const processInput = (inputText) => {
    const lower = inputText.toLowerCase();
    // Comandos directos para manipular la app
    if (lower.includes('abre finanzas')) { navigate('/finanzas'); return 'Abriendo Finanzas...'; }
    if (lower.includes('abre almacén') || lower.includes('abre almacen')) { navigate('/warehouse'); return 'Abriendo Warehouse...'; }
    if (lower.includes('abre clientes')) { navigate('/clientes'); return 'Abriendo Clientes...'; }
    if (lower.includes('abre cotizaciones')) { navigate('/cotizaciones'); return 'Abriendo Cotizaciones...'; }
    if (lower.includes('abre trabajo') || lower.includes('abre producción')) { navigate('/production'); return 'Abriendo área de Producción...'; }
    if (lower.includes('abre ventas')) { navigate('/ventas'); return 'Abriendo Ventas Web...'; }
    if (lower.includes('dashboard') || lower.includes('panel')) { navigate('/dashboard'); return 'Llevándote al panel principal...'; }
    // Comandos de registro
    if (lower.includes('registra gasto')) { navigate('/finanzas'); return 'Listo para registrar un gasto en Finanzas.'; }
    if (lower.includes('registra ingreso')) { navigate('/finanzas'); return 'Listo para registrar un ingreso en Finanzas.'; }
    if (lower.includes('nuevo cliente')) { navigate('/clientes'); return 'Listo para registrar un nuevo cliente.'; }
    if (lower.includes('nueva cotización')) { navigate('/cotizaciones'); return 'Listo para crear una nueva cotización.'; }
    // Búsqueda en memoria
    const memFound = memory.find(m => lower.includes(m.question));
    if (memFound) return memFound.answer;
    // Búsqueda en base de conocimiento
    for (const item of knowledge) {
      if (item.keywords.some(k => lower.includes(k))) return item.response;
    }
    return null;
  };

  // Autoaprendizaje: guardar nuevas preguntas y respuestas
  const learn = (question, answer) => {
    setMemory(mem => [...mem, { question, answer }]);
  };

  // Nueva función de manejo de mensajes
  const handleChatbotMessage = (inputText) => {
    const userMessage = { text: inputText, sender: 'user', timestamp: Date.now() };
    const updatedHistory = [...chatbotState.history, userMessage];
    let response = processInput(inputText);
    if (!response) {
      // Si no entiende, pregunta y aprende si el usuario responde
      response = 'No entendí tu pregunta. ¿Quieres enseñarme la respuesta para futuras ocasiones? (Responde: "Aprende: <respuesta>")';
      setChatbotState({ ...chatbotState, history: [...updatedHistory, { text: response, sender: 'bot', timestamp: Date.now() }] });
      systemMonitor.log('chatbot_response', { input: inputText, response });
      return;
    }
    // Aprendizaje si el usuario responde "Aprende: ..."
    if (inputText.toLowerCase().startsWith('aprende:')) {
      const lastQ = chatbotState.history.filter(m => m.sender === 'user').slice(-2, -1)[0];
      if (lastQ) learn(lastQ.text.toLowerCase(), inputText.replace('Aprende:', '').trim());
      response = '¡He aprendido la respuesta!';
    }
    setChatbotState({ ...chatbotState, history: [...updatedHistory, { text: response, sender: 'bot', timestamp: Date.now() }] });
    systemMonitor.log('chatbot_response', { input: inputText, response });
  };

  // Reemplazar handleSend por el nuevo chatbot
  const handleSend = () => {
    if (!input.trim()) return;
    handleChatbotMessage(input);
    setInput('');
  };

  // Memoizar el renderizado de los mensajes del chatbot
  const MemoizedMessages = React.memo(({ history }) => (
    <div className="messages" style={{ maxHeight: size.height - 180 }}>
      {history.map((msg, i) => (
        <div key={i} className={`message ${msg.sender}`}>{msg.text}</div>
      ))}
    </div>
  ));

  // Memoizar las acciones para evitar renders innecesarios
  const memoizedActions = useMemo(() => ([
    { label: 'Menú Principal', action: () => navigate('/dashboard') },
    { label: 'Finanzas', action: () => navigate('/finanzas') },
    { label: 'Producción', action: () => navigate('/production') },
    { label: 'Cotizaciones', action: () => navigate('/cotizaciones') },
    { label: 'Ventas Web', action: () => { try { navigate('/ventas'); } catch (e) { window.location.href = '/ventas'; } } },
    { label: 'Abrir Página Web Interna', action: () => window.open('', '_blank') }
  ]), [navigate]);

  useEffect(() => {
    if (reminderMessage && visible) {
      setMessages(msgs => [
        ...msgs,
        { text: reminderMessage, sender: 'ia', type: 'reminder' }
      ]);
    }
  }, [reminderMessage, visible]);

  // Acción sobre recordatorio (confirmar, posponer, descartar)
  const handleReminderAction = (action, event) => {
    if (action === 'posponer') {
      setShowPosponer(true);
      setPosponerEvent(event);
      return;
    }
    if (onReminderAction) onReminderAction(action, event);
    setMessages(msgs => [
      ...msgs,
      { text: `Evento "${event.title}" marcado como ${action}.`, sender: 'ia' }
    ]);
  };

  const handlePosponerSubmit = () => {
    if (onReminderAction && posponerEvent) {
      onReminderAction('posponer', { ...posponerEvent, date: nuevaFecha, type: nuevaPrioridad });
    }
    setShowPosponer(false);
    setPosponerEvent(null);
    setNuevaFecha('');
    setNuevaPrioridad('medio');
    setMessages(msgs => [
      ...msgs,
      { text: `Evento pospuesto para el ${nuevaFecha} con prioridad ${nuevaPrioridad}.`, sender: 'ia' }
    ]);
  };

  // Botón flotante
  if (!visible) {
    return (
      <button
        className="assistant-fab"
        onClick={onOpen}
        title="Abrir Asistente IA"
        style={{ position: 'fixed', left: fabPos.x, top: fabPos.y, zIndex: 3000 }}
        onMouseDown={onFabMouseDown}
      >
        🤖
      </button>
    );
  }
  // Ventana flotante y movible
  return (
    <div
      className="assistant-container"
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: size.width,
        height: size.height,
        zIndex: 3000,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="assistant-header"
        style={{ cursor: 'move', userSelect: 'none' }}
        onMouseDown={onHeaderMouseDown}
      >
        <span>🤖 Asistente IA</span>
        <button className="assistant-close" onClick={onClose}>×</button>
      </div>
      <div className="assistant-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`assistant-msg assistant-msg-${msg.sender}`}>{msg.text}
            {msg.type === 'reminder' && (
              <div className="assistant-reminder-actions">
                <button onClick={() => handleReminderAction('confirmado', msg.event)}>Confirmar</button>
                <button onClick={() => handleReminderAction('posponer', msg.event)}>Posponer</button>
                <button onClick={() => handleReminderAction('descartado', msg.event)}>Descartar</button>
              </div>
            )}
          </div>
        ))}
        {showPosponer && (
          <div className="assistant-posponer-modal">
            <h4>Posponer evento</h4>
            <label>Fecha nueva: <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} /></label>
            <label>Prioridad:
              <select value={nuevaPrioridad} onChange={e => setNuevaPrioridad(e.target.value)}>
                <option value="urgente">Urgente</option>
                <option value="importante">Importante</option>
                <option value="trabajo">Trabajo</option>
                <option value="prioridad">Prioridad</option>
                <option value="medio">Medio</option>
              </select>
            </label>
            <button onClick={handlePosponerSubmit}>Guardar</button>
            <button onClick={() => setShowPosponer(false)}>Cancelar</button>
          </div>
        )}
      </div>
      <div className="assistant-actions">
        {memoizedActions.map((btn, idx) => (
          <button key={btn.label} className="ia-action-btn" onClick={btn.action}>{btn.label}</button>
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta o tarea..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
      {/* Handles de resize en cada borde/corner */}
      <div className="assistant-resize-handle" style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('bottom-right')}>
        <span style={{ fontSize: 18, color: '#39ff14', userSelect: 'none' }}>↘</span>
      </div>
      <div className="assistant-resize-handle" style={{ position: 'absolute', left: 0, bottom: 0, width: 18, height: 18, cursor: 'nesw-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('bottom-left')}>
        <span style={{ fontSize: 18, color: '#39ff14', userSelect: 'none' }}>↙</span>
      </div>
      <div className="assistant-resize-handle" style={{ position: 'absolute', right: 0, top: 0, width: 18, height: 18, cursor: 'nesw-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('top-right')}>
        <span style={{ fontSize: 18, color: '#39ff14', userSelect: 'none' }}>↗</span>
      </div>
      <div className="assistant-resize-handle" style={{ position: 'absolute', left: 0, top: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('top-left')}>
        <span style={{ fontSize: 18, color: '#39ff14', userSelect: 'none' }}>↖</span>
      </div>
      {/* Bordes para resize horizontal/vertical */}
      <div className="assistant-resize-handle" style={{ position: 'absolute', left: 0, top: '50%', width: 12, height: 32, cursor: 'ew-resize', zIndex: 10, transform: 'translateY(-50%)' }} onMouseDown={onResizeHandleDown('left')} />
      <div className="assistant-resize-handle" style={{ position: 'absolute', right: 0, top: '50%', width: 12, height: 32, cursor: 'ew-resize', zIndex: 10, transform: 'translateY(-50%)' }} onMouseDown={onResizeHandleDown('right')} />
      <div className="assistant-resize-handle" style={{ position: 'absolute', top: 0, left: '50%', width: 32, height: 12, cursor: 'ns-resize', zIndex: 10, transform: 'translateX(-50%)' }} onMouseDown={onResizeHandleDown('top')} />
      <div className="assistant-resize-handle" style={{ position: 'absolute', bottom: 0, left: '50%', width: 32, height: 12, cursor: 'ns-resize', zIndex: 10, transform: 'translateX(-50%)' }} onMouseDown={onResizeHandleDown('bottom')} />
    </div>
  );
};

export default Assistant;