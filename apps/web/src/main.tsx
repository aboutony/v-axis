// apps/web/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App' // Path aligned to your 'app' folder structure
import './styles/index.css' // Path aligned to the 'styles' folder you just uploaded

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)