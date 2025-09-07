import { useState } from 'react'
import './App.css'
import { Button } from './components/ui/button'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">shadcn/ui + Tailwind in Electron</h1>
      <div className="flex items-center gap-2">
        <Button onClick={() => setCount((c) => c + 1)}>Count: {count}</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <p className="text-sm text-muted-foreground">Edit src/App.tsx to continue.</p>
    </div>
  )
}

export default App
