import React, { useEffect, ReactNode } from 'react';
import { useUI } from '../context/UIContext';

interface AppWrapperProps {
  children: ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const { uiStyle } = useUI();

  useEffect(() => {
    // Set data attribute on root element for CSS selectors
    document.documentElement.setAttribute('data-ui-style', uiStyle);

    // Also set on body for additional targeting
    document.body.setAttribute('data-ui-style', uiStyle);
  }, [uiStyle]);

  return <>{children}</>;
};

export const UIStyleWatcher: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { uiStyle } = useUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-style', uiStyle);
  }, [uiStyle]);

  return <>{children}</>;
};