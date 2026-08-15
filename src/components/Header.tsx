import { APP_NAME, PROPERTY_NAME } from '../constants'

type HeaderProps = {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  onOpenAdmin?: () => void
}

export function Header({
  userEmail,
  onSignOut,
  isSigningOut,
  onOpenAdmin,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          <p className="app-header-title">{APP_NAME}</p>
          <p className="app-header-property">{PROPERTY_NAME}</p>
        </div>
        <div className="app-header-account">
          <p className="app-header-user" title={userEmail}>
            {userEmail}
          </p>
          <div className="app-header-actions">
            {onOpenAdmin ? (
              <button type="button" className="header-btn" onClick={onOpenAdmin}>
                管理
              </button>
            ) : null}
            <button
              type="button"
              className="logout-btn"
              onClick={onSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'ログアウト中…' : 'ログアウト'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
