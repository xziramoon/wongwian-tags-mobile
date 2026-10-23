import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/tag.css'
import './styles/tag-ink.css'
import './styles/tag-theme.css'
import './styles/tag-veg.css'
import './styles/tag-mono.css'
import './styles/tag-fridge.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
