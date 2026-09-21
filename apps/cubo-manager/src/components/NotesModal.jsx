import React, { useState, useEffect } from "react";
import "./NotesModal.css";

const getNotes = () => JSON.parse(localStorage.getItem("notes") || "[]");

const NotesModal = ({ onClose }) => {
  const [notes, setNotes] = useState(getNotes());
  const [text, setText] = useState("");
  const [reminder, setReminder] = useState("");

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach(note => {
        if (
          note.reminder &&
          !note.notified &&
          new Date(note.reminder) <= now
        ) {
          alert(`Recordatorio: ${note.text}`);
          setNotes(prev =>
            prev.map(n =>
              n === note ? { ...n, notified: true } : n
            )
          );
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [notes]);

  const addNote = () => {
    if (!text.trim()) return;
    setNotes([
      ...notes,
      { text, reminder: reminder || null, notified: false }
    ]);
    setText("");
    setReminder("");
  };

  const deleteNote = idx => {
    setNotes(notes.filter((_, i) => i !== idx));
  };

  return (
    <div className="notes-modal-bg">
      <div className="notes-modal large">
        <h2>Bloc de Notas</h2>
        <textarea
          className="big-textarea"
          placeholder="Escribe tu nota..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div>
          <label style={{ fontSize: "1.2rem" }}>
            Recordar el:
            <input
              type="datetime-local"
              value={reminder}
              onChange={e => setReminder(e.target.value)}
              style={{ fontSize: "1.1rem", marginLeft: 10 }}
            />
          </label>
        </div>
        <button onClick={addNote}>Guardar Nota</button>
        <div className="notes-list">
          {notes.length === 0 && (
            <div style={{ color: "#888", fontSize: "1.3rem", marginTop: 20 }}>
              No hay notas guardadas.
            </div>
          )}
          {notes.map((note, idx) => (
            <div key={idx} className="note-item big-note">
              <div style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{note.text}</div>
              {note.reminder && (
                <div className="note-reminder">
                  Recordar: {new Date(note.reminder).toLocaleString()}
                </div>
              )}
              <button onClick={() => deleteNote(idx)}>Eliminar</button>
            </div>
          ))}
        </div>
        <button className="close-notes" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default NotesModal;