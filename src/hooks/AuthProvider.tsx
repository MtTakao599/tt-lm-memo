import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './authContext'

function isPasswordRecoveryRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (hashParams.get('type') === 'recovery') {
    return true
  }
  return new URLSearchParams(window.location.search).get('type') === 'recovery'
}

// Captured before Supabase clears the recovery hash. The PASSWORD_RECOVERY
// event is emitted after the session is stored, so this flag keeps the app
// from treating that session as a normal login.
const openedFromRecoveryLink = isPasswordRecoveryRedirect()
let passwordRecoveryPending = false

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    passwordRecoveryPending = true
  }
  if (event === 'SIGNED_OUT') {
    passwordRecoveryPending = false
  }
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue['session']>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryPending = true
        setIsPasswordRecovery(true)
      }
      if (event === 'SIGNED_OUT') {
        passwordRecoveryPending = false
        setIsPasswordRecovery(false)
      }
      setSession(nextSession)
      setIsLoading(false)
    })

    if (passwordRecoveryPending) {
      setIsPasswordRecovery(true)
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (passwordRecoveryPending) {
        setIsPasswordRecovery(true)
        setIsLoading(false)
        return
      }
      if (!openedFromRecoveryLink) {
        setIsLoading(false)
        return
      }
      window.setTimeout(() => {
        if (passwordRecoveryPending) {
          setIsPasswordRecovery(true)
        }
        setIsLoading(false)
      }, 0)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return 'メールアドレスまたはパスワードを確認してください。'
    }

    return null
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      if (error.status === 429) {
        return '送信回数の上限に達しました。時間をおいて再度お試しください。'
      }
      return 'メールを送信できませんでした。時間をおいて再度お試しください。'
    }

    return null
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return 'パスワードを更新できませんでした。別のパスワードをお試しください。'
    }

    return null
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isPasswordRecovery,
      signIn,
      requestPasswordReset,
      updatePassword,
      signOut,
    }),
    [
      session,
      isLoading,
      isPasswordRecovery,
      signIn,
      requestPasswordReset,
      updatePassword,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
