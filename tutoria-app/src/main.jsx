import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { SessionTimeoutProvider } from './context/SessionTimeoutContext.jsx'
import { UserProvider } from './context/UserContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionTimeoutProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </SessionTimeoutProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
