import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '../icons/Icons'
import { useAppStore } from '../../store/app'

interface AppHeaderProps {
  /** Compact mode title (14.5px, borderBottom) */
  title: string
  /** Optional subtitle below title */
  sub?: string
  /** Show back button */
  back?: boolean
  /** Large display mode (26px font-display, no border) */
  large?: boolean
  /** Right-side action buttons */
  right?: ReactNode
  /** Custom back handler. Defaults to navigate(-1) */
  onBack?: () => void
}

export default function AppHeader({
  title,
  sub,
  back,
  large,
  right,
  onBack,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const setNavDirection = useAppStore((s) => s.setNavDirection)

  function handleBack() {
    if (onBack) { onBack(); return }
    setNavDirection('back')
    navigate(-1)
  }

  return (
    <div className={`m-app-header${large ? ' large' : ''}`}>
      {back && (
        <button className="m-app-header-back" onClick={handleBack} aria-label="Atrás">
          <ArrowLeftIcon />
        </button>
      )}
      <div className="m-app-header-info">
        {sub && <div className="m-app-header-sub">{sub}</div>}
        <h1 className="m-app-header-title">{title}</h1>
      </div>
      {right && <div className="m-app-header-right">{right}</div>}
    </div>
  )
}
