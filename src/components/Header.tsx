import { APP_NAME, PROPERTY_NAME } from '../constants'

type HeaderProps = {
  userName: string
}

export function Header({ userName }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          <p className="app-header-title">{APP_NAME}</p>
          <p className="app-header-property">{PROPERTY_NAME}</p>
        </div>
        <p className="app-header-user">{userName}</p>
      </div>
    </header>
  )
}
