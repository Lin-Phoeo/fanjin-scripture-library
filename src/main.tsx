import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './design-system.css';
import './reading-tools.css';
import './settings.css';
import { applyTheme, readPreferences } from './lib/reading-preferences';

applyTheme(readPreferences().theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
