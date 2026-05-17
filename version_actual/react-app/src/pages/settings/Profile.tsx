import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'

export default function Profile() {
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Perfil" back />

      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: 'linear-gradient(135deg, var(--amber), var(--amber-s))',
            display: 'grid',
            placeItems: 'center',
            fontSize: 36,
          }}
        >
          👤
        </div>
        <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Cambiar foto</div>
      </div>

      <div style={{ padding: '20px 16px 8px', display: 'grid', gap: 8 }}>
        <div className="m-form-field">
          <div className="m-form-field-content">
            <div className="m-form-field-label">Nombre completo</div>
            <input
              className="m-form-field-input"
              id="sett-nombre"
              type="text"
              defaultValue="Anthony Marte"
              placeholder="Tu nombre"
              maxLength={60}
              autoComplete="name"
            />
          </div>
          <div className="m-form-field-right">
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--fg-mute)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4l11-11-4-4L4 16v4z"/>
            </svg>
          </div>
        </div>

        <div className="m-form-field" style={{ opacity: .6, cursor: 'not-allowed' }}>
          <div className="m-form-field-content">
            <div className="m-form-field-label">Correo electrónico</div>
            <input
              className="m-form-field-input"
              id="sett-correo-display"
              type="email"
              defaultValue="anthonymarte12@gmail.com"
              disabled
              autoComplete="off"
            />
          </div>
          <div className="m-form-field-right" style={{ fontSize: '9.5px', color: 'var(--pos)' }}>✓</div>
        </div>
      </div>

      <div style={{ padding: '4px 16px' }}>
        <button
          className="m-save-btn"
          onClick={handleSave}
          style={{
            background: saved ? 'var(--pos)' : undefined,
            transition: 'background .2s',
          }}
        >
          {saved ? '✓  Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
