import React, { useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import './CoverImageUploader.css';

const CoverImageUploader = ({ moduleName, onUpload }) => {
  const { getTheme } = useTheme();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const theme = getTheme(moduleName);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 5MB');
      return;
    }

    setUploading(true);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result;
      setPreview(imageData);
      if (onUpload) {
        onUpload(imageData);
      }
      setUploading(false);
    };
    reader.onerror = () => {
      alert('Error al leer el archivo');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="cover-uploader"
      style={{
        borderColor: theme.primary,
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="cover-uploader-content">
        {preview ? (
          <>
            <img src={preview} alt="Portada" className="cover-preview" />
            <div className="cover-actions">
              <button
                className="cover-action-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: theme.primary, color: theme.background }}
              >
                📸 Cambiar imagen
              </button>
              <button
                className="cover-action-btn"
                onClick={() => {
                  setPreview(null);
                  if (onUpload) onUpload(null);
                }}
                style={{ background: theme.accent, color: theme.background }}
              >
                ❌ Eliminar
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="cover-placeholder"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}20 0%, ${theme.secondary}20 100%)`,
              }}
            >
              <span className="cover-icon">📸</span>
              <p>Portada del módulo</p>
            </div>
            <button
              className="cover-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: theme.primary, color: theme.background }}
            >
              {uploading ? '⏳ Subiendo...' : '📤 Subir portada'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CoverImageUploader;
