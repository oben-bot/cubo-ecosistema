import React, { useState, useRef, useEffect } from 'react';
import './CalendarWidget.css';
import { ReactComponent as CalendarIcon } from '../../components/assets/calendar-icon.svg';

const COLORS = {
  urgente: '#e53935',
  importante: '#222',
  trabajo: '#43a047',
  prioridad: '#fbc02d',
  medio: '#1976d2',
  realizado: '#bdbdbd',
  confirmado: '#43a047',
  descartado: '#e53935',
};

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;
const CalendarWidget = ({ events, onAddEvent, onSelectDay, onClose }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const days = getMonthDays(currentYear, currentMonth);

  // Agrupar eventos por día
  const eventsByDay = {};
  events.forEach(ev => {
    const key = ev.date.split('T')[0];
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // --- Ventana movible y expandible estilo IA ---
  const [pos, setPos] = useState({ x: 64, y: 64 });
  const [size, setSize] = useState({ width: Math.min(window.innerWidth * 0.6, 700), height: Math.min(window.innerHeight * 0.7, 600) });
  const [drag, setDrag] = useState(null);
  const [resizeDir, setResizeDir] = useState(null);
  const modalRef = useRef();

  // Clamp para mantener dentro del viewport
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

  // Drag header
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
  const onMouseMove = (e) => {
    if (!drag || drag.type !== 'window') return;
    const newX = clamp(e.clientX - drag.offsetX, 0, window.innerWidth - size.width);
    const newY = clamp(e.clientY - drag.offsetY, 0, window.innerHeight - size.height);
    setPos({ x: newX, y: newY });
  };
  const onMouseUp = () => {
    setDrag(null);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Resize desde cualquier borde/corner
  const onResizeHandleDown = (dir) => (e) => {
    if (e.button !== 0) return;
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
      newWidth = clamp(resizeDir.startWidth + (e.clientX - resizeDir.startX), MIN_WIDTH, window.innerWidth - newPos.x);
    }
    if (resizeDir.dir.includes('bottom')) {
      newHeight = clamp(resizeDir.startHeight + (e.clientY - resizeDir.startY), MIN_HEIGHT, window.innerHeight - newPos.y);
    }
    if (resizeDir.dir.includes('left')) {
      const delta = e.clientX - resizeDir.startX;
      newWidth = clamp(resizeDir.startWidth - delta, MIN_WIDTH, window.innerWidth - newPos.x);
      newPos.x = clamp(resizeDir.startPos.x + delta, 0, window.innerWidth - newWidth);
    }
    if (resizeDir.dir.includes('top')) {
      const delta = e.clientY - resizeDir.startY;
      newHeight = clamp(resizeDir.startHeight - delta, MIN_HEIGHT, window.innerHeight - newPos.y);
      newPos.y = clamp(resizeDir.startPos.y + delta, 0, window.innerHeight - newHeight);
    }
    setSize({ width: newWidth, height: newHeight });
    setPos(newPos);
  };
  const onResizeUp = () => {
    setResizeDir(null);
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
  };

  // Centrar al abrir y al cambiar tamaño de ventana
  useEffect(() => {
    setPos({
      x: clamp((window.innerWidth - size.width) / 2, 0, window.innerWidth - size.width),
      y: clamp((window.innerHeight - size.height) / 2, 0, window.innerHeight - size.height)
    });
    // eslint-disable-next-line
  }, [size.width, size.height, window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const handleResize = () => {
      setSize(s => ({
        width: clamp(s.width, MIN_WIDTH, window.innerWidth),
        height: clamp(s.height, MIN_HEIGHT, window.innerHeight)
      }));
      setPos(p => ({
        x: clamp(p.x, 0, window.innerWidth - size.width),
        y: clamp(p.y, 0, window.innerHeight - size.height)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size.width, size.height, pos.x, pos.y]);

  // --- UI ---
  return (
    <div ref={modalRef} className="calendar-widget-modal" style={{ left: pos.x, top: pos.y, width: size.width, height: size.height, position: 'fixed', zIndex: 3000 }}>
      <div className="calendar-header" onMouseDown={onHeaderMouseDown} style={{ cursor: 'move', background: '#fff0e6', color: '#b71c1c' }}>
        <button onClick={handlePrevMonth}>{'<'}</button>
        <span style={{ fontWeight: 'bold', fontSize: '1.3em' }}>{today.toLocaleString('default', { month: 'long' })} {currentYear}</span>
        <button onClick={handleNextMonth}>{'>'}</button>
        <button className="calendar-close-btn" onClick={onClose}>Cerrar</button>
      </div>
      <div className="calendar-grid" style={{ height: size.height - 180, overflow: 'auto' }}>
        {days.map(day => {
          const key = day.toISOString().split('T')[0];
          const isToday = key === new Date().toISOString().split('T')[0];
          return (
            <div key={key} className={"calendar-day" + (isToday ? " calendar-today" : "")}
              style={{ background: isToday ? '#ffe0b2' : '#fff', border: isToday ? '2px solid #b71c1c' : '1.5px solid #b71c1c33' }}
              onClick={() => onSelectDay(key)}>
              <span style={{ color: isToday ? '#b71c1c' : '#222', fontWeight: isToday ? 'bold' : 'normal' }}>{day.getDate()}</span>
              <div className="calendar-markers">
                {(eventsByDay[key] || []).map((ev, i) => (
                  <span key={i} className="calendar-marker" style={{ background: COLORS[ev.status] || COLORS[ev.type] }} title={ev.title}></span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button className="calendar-add-btn" onClick={onAddEvent}>Agregar evento/recordatorio</button>
      <button className="calendar-menu-btn" onClick={onClose}>Regresar a menú</button>
      {/* Handles de resize en cada borde/corner */}
      <div className="calendar-resize-handle" style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('bottom-right')}>
        <span style={{ fontSize: 18, color: '#b71c1c', userSelect: 'none' }}>↘</span>
      </div>
      <div className="calendar-resize-handle" style={{ position: 'absolute', left: 0, bottom: 0, width: 18, height: 18, cursor: 'nesw-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('bottom-left')}>
        <span style={{ fontSize: 18, color: '#b71c1c', userSelect: 'none' }}>↙</span>
      </div>
      <div className="calendar-resize-handle" style={{ position: 'absolute', right: 0, top: 0, width: 18, height: 18, cursor: 'nesw-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('top-right')}>
        <span style={{ fontSize: 18, color: '#b71c1c', userSelect: 'none' }}>↗</span>
      </div>
      <div className="calendar-resize-handle" style={{ position: 'absolute', left: 0, top: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }} onMouseDown={onResizeHandleDown('top-left')}>
        <span style={{ fontSize: 18, color: '#b71c1c', userSelect: 'none' }}>↖</span>
      </div>
      {/* Bordes para resize horizontal/vertical */}
      <div className="calendar-resize-handle" style={{ position: 'absolute', left: 0, top: '50%', width: 12, height: 32, cursor: 'ew-resize', zIndex: 10, transform: 'translateY(-50%)' }} onMouseDown={onResizeHandleDown('left')} />
      <div className="calendar-resize-handle" style={{ position: 'absolute', right: 0, top: '50%', width: 12, height: 32, cursor: 'ew-resize', zIndex: 10, transform: 'translateY(-50%)' }} onMouseDown={onResizeHandleDown('right')} />
      <div className="calendar-resize-handle" style={{ position: 'absolute', top: 0, left: '50%', width: 32, height: 12, cursor: 'ns-resize', zIndex: 10, transform: 'translateX(-50%)' }} onMouseDown={onResizeHandleDown('top')} />
      <div className="calendar-resize-handle" style={{ position: 'absolute', bottom: 0, left: '50%', width: 32, height: 12, cursor: 'ns-resize', zIndex: 10, transform: 'translateX(-50%)' }} onMouseDown={onResizeHandleDown('bottom')} />
    </div>
  );
};

export default CalendarWidget;
