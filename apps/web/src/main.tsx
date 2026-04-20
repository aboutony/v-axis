// apps/web/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' 

// We are removing the index.css import that caused the crash. 
// All styles for the Neo-Tactile UI are now embedded in the App components.
// import './index.css' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)