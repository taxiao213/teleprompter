import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrap } from '../bootstrap'
import App from './App'
import '../styles/global.css'

async function main(): Promise<void> {
  await bootstrap()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void main()
