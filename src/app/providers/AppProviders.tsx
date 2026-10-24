import React, { StrictMode, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../components/Toast';
import { UIProvider, useUI } from '../../context/UIContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { syncAuthState } from '../bootstrap/syncAuthState';
import { reportPilotError } from '../../services/supportEscalationTicketingService';

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

const AuthenticatedErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <ErrorBoundary
      onReportError={user?.firmId ? async (error) => {
        await reportPilotError({
          user,
          title: 'CAATH application error',
          errorMessage: `${error.name}: ${error.message}`.slice(0, 1000),
          workflowArea: window.location.pathname,
          reproductionSteps: 'Reported from the in-app recovery screen.',
        });
      } : undefined}
    >
      {children}
    </ErrorBoundary>
  );
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
                <ToastProvider>
                  <AuthenticatedErrorBoundary>{children}</AuthenticatedErrorBoundary>
                </ToastProvider>
              </EnterpriseStateSync>
            </UIProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
};
