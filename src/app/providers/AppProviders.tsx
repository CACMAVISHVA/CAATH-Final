import React, { StrictMode, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../components/Toast';
import { UIProvider, useUI } from '../../context/UIContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { syncAuthState } from '../bootstrap/syncAuthState';

const UIStyleSync: React.FC = () => {
  const { uiStyle } = useUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-style', uiStyle);
  }, [uiStyle]);

  return null;
};

const EnterpriseStateSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    syncAuthState(user);
  }, [user]);

  return <>{children}</>;
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <UIProvider>
              <UIStyleSync />
              <EnterpriseStateSync>
                <ToastProvider>{children}</ToastProvider>
              </EnterpriseStateSync>
            </UIProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
};
