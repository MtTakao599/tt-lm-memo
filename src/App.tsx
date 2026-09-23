import { useState } from 'react'
import { AuthLoading } from './components/AuthLoading'
import { Login } from './components/Login'
import { MemoApp } from './components/MemoApp'
import { useAuth } from './hooks/useAuth'
import './App.css'

function App() {
  const { user, isLoading, isPasswordRecovery, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return <AuthLoading />
  }

  if (!user || isPasswordRecovery) {
    return <Login />
  }

  return (
    <MemoApp
      userId={user.id}
      userEmail={user.email ?? ''}
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
    />
  )
}

export default App
