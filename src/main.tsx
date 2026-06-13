import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/index';
import { AppRoutes } from './routes/AppRoutes';
import { runtimeKernel } from './runtime/production';

import './index.css';

runtimeKernel.start();

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <AppRoutes />
  </AppProviders>,
); 
