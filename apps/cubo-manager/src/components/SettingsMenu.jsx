import React, { useState } from "react";
import "./SettingsMenu.css";

const sections = [
  { key: "profile", label: "Perfil de usuario" },
  { key: "theme", label: "Tema (oscuro/claro)" },
  { key: "language", label: "Idioma" },
  { key: "security", label: "Seguridad" },
  { key: "about", label: "Acerca de" },
];

const colorOptions = [
  { name: "Verde", value: "#39ff14" },
  { name: "Azul", value: "#00bfff" },
  { name: "Rojo", value: "#ff4b2b" },
  { name: "Naranja", value: "#ff9800" },
];

const SettingsMenu = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [profile, setProfile] = useState({ name: "", email: "", photo: "" });
  const [theme, setTheme] = useState({ mode: "light", color: "#39ff14" });
  const [language, setLanguage] = useState("es");
  const [password, setPassword] = useState("");
  const [about] = useState(
    "Sharpy App es una plataforma de gestión para El Cubo De Madera. Todos los derechos reservados © Obenyair Emmanuel Meza Rojas, propietario de El Cubo De Madera."
  );

  // Cambia el tema de la app (solo colores, no imágenes)
  React.useEffect(() => {
    document.body.setAttribute("data-theme", theme.mode);
    document.body.style.setProperty("--main-color", theme.color);
  }, [theme]);

  return (
    <div className="settings-menu-bg">
      <div className="settings-menu">
        <h2>Configuraciones</h2>
        {!activeSection ? (
          <ul>
            {sections.map((s) => (
              <li key={s.key} onClick={() => setActiveSection(s.key)}>
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <button className="back-settings" onClick={() => setActiveSection(null)}>
              ← Volver
            </button>
            {activeSection === "profile" && (
              <div>
                <h3>Perfil de usuario</h3>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="URL de foto de perfil"
                  value={profile.photo}
                  onChange={e => setProfile({ ...profile, photo: e.target.value })}
                />
                {profile.photo && (
                  <img
                    src={profile.photo}
                    alt="Foto de perfil"
                    style={{ width: 80, height: 80, borderRadius: "50%", margin: "10px auto" }}
                  />
                )}
                <button>Guardar</button>
              </div>
            )}
            {activeSection === "theme" && (
              <div>
                <h3>Tema</h3>
                <label>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme.mode === "light"}
                    onChange={() => setTheme({ ...theme, mode: "light" })}
                  />{" "}
                  Claro
                </label>
                <label>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme.mode === "dark"}
                    onChange={() => setTheme({ ...theme, mode: "dark" })}
                  />{" "}
                  Oscuro
                </label>
                <div style={{ marginTop: 20 }}>
                  <span>Color principal: </span>
                  {colorOptions.map(opt => (
                    <button
                      key={opt.value}
                      style={{
                        background: opt.value,
                        border: theme.color === opt.value ? "3px solid #222" : "2px solid #ccc",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        margin: "0 8px",
                        cursor: "pointer"
                      }}
                      onClick={() => setTheme({ ...theme, color: opt.value })}
                    />
                  ))}
                </div>
              </div>
            )}
            {activeSection === "language" && (
              <div>
                <h3>Idioma</h3>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  <option value="es">Español latino</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
            )}
            {activeSection === "security" && (
              <div>
                <h3>Cambiar contraseña</h3>
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button>Cambiar contraseña</button>
              </div>
            )}
            {activeSection === "about" && (
              <div>
                <h3>Acerca de</h3>
                <p style={{ fontSize: "1.2rem", color: "#222" }}>
                  {about}
                </p>
              </div>
            )}
          </div>
        )}
        <button className="close-settings" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default SettingsMenu;