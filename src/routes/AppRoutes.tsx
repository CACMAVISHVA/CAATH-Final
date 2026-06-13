import React, { Suspense } from 'react';
import { PageLoader } from '../components/loaders/PageLoader';

const RootApp = React.lazy(() => import('../App'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <RootApp />
    </Suspense>
  );
};
