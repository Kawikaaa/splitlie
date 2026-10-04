import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n/LanguageContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import { IconContext } from '@phosphor-icons/react'
import '@fontsource-variable/geist'
import './styles.css'
import './product-theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AppErrorBoundary>
        <IconContext.Provider value={{ color: 'currentColor', size: 18, weight: 'regular', mirrored: false }}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </IconContext.Provider>
      </AppErrorBoundary>
    </LanguageProvider>
  </React.StrictMode>,
)
