import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureTextBuilder } from 'troika-three-text';
import App from './App';
import './styles/globals.css';

// Texto 3D (drei <Text> / troika) na THREAD PRINCIPAL — sem web worker via
// blob:. Isso elimina a dependência de CSP `worker-src/script-src blob:` que
// derrubava a cena inteira no deploy (worker bloqueado → cards "apagados").
// Deve ser chamado antes do primeiro <Text> ser montado.
configureTextBuilder({ useWorker: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
