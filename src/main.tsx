import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/index';
import { AppRoutes } from './routes/AppRoutes';
import { runtimeKernel } from './runtime/production';

import './index.css';
import './premium-finish.css';

// Cosmetic-only preview preference. No account or workspace data is affected.
// ?appearance=classic restores the original CSS for this tab immediately.
const requestedAppearance = new URLSearchParams(window.location.search).get('appearance');
let appearance = requestedAppearance === 'classic' ? 'classic' : 'premium';
try {
  if (requestedAppearance === 'classic' || requestedAppearance === 'premium') {
    sessionStorage.setItem('caath-ui-finish', requestedAppearance);
  } else {
    appearance = sessionStorage.getItem('caath-ui-finish') === 'classic' ? 'classic' : 'premium';
  }
} catch {
  // Browsers blocking storage can still select the appearance through the URL.
}
document.documentElement.dataset.uiFinish = appearance;

runtimeKernel.start();

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <AppRoutes />
  </AppProviders>,
); 
