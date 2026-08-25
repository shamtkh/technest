import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import './index.css'
import './i18n'
import { store, persistor } from './store/store'
import App from './App.jsx'
import { ToastProvider } from './components/ToastContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
