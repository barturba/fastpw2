import { useEffect, useState } from 'react'
import './App.css'
import { Toaster } from '@/components/ui/toaster'
import { SetupScreen } from '@/pages/Setup'
import { LoginScreen } from '@/pages/Login'
import { MainScreen } from '@/pages/Main'
import { ipc, type PasswordEntry } from '@/lib/ipc'

function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [entries, setEntries] = useState<PasswordEntry[] | null>(null)
  const [masterPassword, setMasterPassword] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const res = await ipc.checkFirstRun()
      if (res?.success) {
        setNeedsSetup(!res.exists)
      } else {
        setNeedsSetup(true)
      }
    })()
  }, [])

  if (needsSetup === null) return null

  return (
    <>
      {needsSetup ? (
        <SetupScreen onDone={() => setNeedsSetup(false)} />
      ) : entries && masterPassword ? (
        <MainScreen initialEntries={entries} masterPassword={masterPassword} />
      ) : (
        <LoginScreen onLoaded={(data, pw) => { setEntries(data); setMasterPassword(pw) }} />
      )}
      <Toaster />
    </>
  )
}

export default App
