import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/canvas.css'
import './styles/minimap.css'
import './styles/text-node.css'
import './styles/floating-editor.css'
import './styles/image-node.css'
import './styles/responsive.css'
import App from './App.tsx'
import { AppProviders } from './app/providers/AppProviders.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
