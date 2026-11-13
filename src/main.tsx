import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import './styles/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    window.setInterval(() => {
      if (navigator.onLine) void registration.update();
    }, 60 * 60 * 1000);
  },
  onRegisterError(error) {
    console.warn('No se pudo registrar el service worker:', error);
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el contenedor raíz de HECOFIT.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
