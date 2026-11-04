import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/app.css'
import './styles/tag.css'
import './styles/tag-ink.css'
import './styles/tag-theme.css'
import './styles/tag-veg.css'
import './styles/tag-mono.css'
import './styles/tag-fridge.css'
import './styles/tag-hamper.css'
import './styles/flip.css'
import App from './App.tsx'

document.title = `วงเวียน สแกนป้ายราคา v${__APP_VERSION__}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
