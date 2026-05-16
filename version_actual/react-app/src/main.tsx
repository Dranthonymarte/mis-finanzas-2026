import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/mobile-uix.css'
import './index.css'
import App from './App'

// Force is-mobile so mobile-uix.css body.is-mobile rules apply on all viewports
document.body.classList.add('is-mobile')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
