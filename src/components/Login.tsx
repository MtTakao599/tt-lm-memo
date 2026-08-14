import { useState, type FormEvent } from 'react'
import { APP_NAME, PROPERTY_NAME } from '../constants'
import { useAuth } from '../hooks/useAuth'

export function Login() {
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
      </form>
    </div>
  )
}
