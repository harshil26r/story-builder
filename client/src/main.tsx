import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { bootstrap } from './services/bootstrap';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Read CSRF cookie + bootstrap session (fire-and-forget; App also gates on status)
void bootstrap().catch(() => {
  /* handled by App/gate */
});