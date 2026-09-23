import { useState, type FormEvent, type ReactNode } from 'react'
import { APP_NAME, PROPERTY_NAME } from '../constants'
import { useAuth } from '../hooks/useAuth'

const MIN_PASSWORD_LENGTH = 8

export function Login() {
  const { isPasswordRecovery } = useAuth()
  const [view, setView] = useState<'sign-in' | 'forgot'>('sign-in')

  if (isPasswordRecovery) {
    return <ResetPassword />
  }

  if (view === 'forgot') {
    return <ForgotPassword onBack={() => setView('sign-in')} />
  }

  return <SignIn onForgot={() => setView('forgot')} />
}

function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{APP_NAME}</h1>
        <p className="login-property">{PROPERTY_NAME}</p>
        {children}
      </div>
    </div>
  )
}

function SignIn({ onForgot }: { onForgot: () => void }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const message = await signIn(trimmedEmail, password)
      if (message) {
        setError(message)
      }
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">{APP_NAME}</h1>
        <p className="login-property">{PROPERTY_NAME}</p>

        <div className="field">
          <label htmlFor="login-email">メールアドレス</label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">パスワード</label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'ログイン中…' : 'ログイン'}
        </button>

        <button
          type="button"
          className="login-link"
          disabled={isSubmitting}
          onClick={onForgot}
        >
          パスワードを忘れた方
        </button>
      </form>
    </div>
  )
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('メールアドレスを入力してください。')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const message = await requestPasswordReset(trimmedEmail)
      if (message) {
        setError(message)
      } else {
        setIsSent(true)
      }
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <LoginShell>
        <p className="login-lead">パスワード再設定</p>
        <p className="login-note">
          再設定用のメールを送信しました。届いたメールのリンクから新しいパスワードを設定してください。
        </p>
        <button type="button" className="login-link" onClick={onBack}>
          ログイン画面へ戻る
        </button>
      </LoginShell>
    )
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">{APP_NAME}</h1>
        <p className="login-property">{PROPERTY_NAME}</p>
        <p className="login-lead">パスワード再設定</p>
        <p className="login-note">
          登録済みのメールアドレスを入力してください。再設定用のリンクを送信します。
        </p>

        <div className="field">
          <label htmlFor="reset-email">メールアドレス</label>
          <input
            id="reset-email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '送信中…' : '送信'}
        </button>

        <button
          type="button"
          className="login-link"
          disabled={isSubmitting}
          onClick={onBack}
        >
          ログイン画面へ戻る
        </button>
      </form>
    </div>
  )
}

function ResetPassword() {
  const { updatePassword, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('パスワードは8文字以上にしてください。')
      return
    }

    if (password !== confirmation) {
      setError('パスワードが一致しません。')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const message = await updatePassword(password)
      if (message) {
        setError(message)
      } else {
        setIsUpdated(true)
      }
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleBackToLogin() {
    if (isSubmitting) {
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await signOut()
    } catch {
      setError('ログイン画面へ戻れませんでした。時間をおいて再度お試しください。')
      setIsSubmitting(false)
    }
  }

  if (isUpdated) {
    return (
      <LoginShell>
        <p className="login-lead">パスワード再設定</p>
        <p className="login-note login-note-success">パスワードを変更しました。</p>
        {error ? <p className="form-error">{error}</p> : null}
        <button
          type="button"
          className="btn btn-primary login-submit"
          disabled={isSubmitting}
          onClick={handleBackToLogin}
        >
          {isSubmitting ? '移動中…' : 'ログイン画面へ'}
        </button>
      </LoginShell>
    )
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">{APP_NAME}</h1>
        <p className="login-property">{PROPERTY_NAME}</p>
        <p className="login-lead">新しいパスワード</p>
        <p className="login-note">8文字以上のパスワードを入力してください。</p>

        <div className="field">
          <label htmlFor="new-password">新しいパスワード</label>
          <input
            id="new-password"
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="confirm-password">確認用パスワード</label>
          <input
            id="confirm-password"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmation}
            disabled={isSubmitting}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '変更中…' : 'パスワードを変更'}
        </button>
      </form>
    </div>
  )
}
