import React from 'react';
import { ReactComponent as CalendarIcon } from '../../components/assets/calendar-icon.svg';
import './CalendarShortcut.css';

const CalendarShortcut = ({ onClick }) => (
  <button className="calendar-shortcut-btn" onClick={onClick} title="Calendario">
    <CalendarIcon className="calendar-shortcut-icon" />
  </button>
);

export default CalendarShortcut;
