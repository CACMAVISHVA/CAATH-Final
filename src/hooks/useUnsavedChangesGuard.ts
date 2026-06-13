import { useCallback } from 'react';

export const useUnsavedChangesGuard = (
  hasUnsavedChanges: boolean,
  message = 'Do you want to close without saving?'
) => {
  return useCallback(
    (onConfirmClose: () => void) => {
      if (hasUnsavedChanges && !window.confirm(message)) {
        return false;
      }
      onConfirmClose();
      return true;
    },
    [hasUnsavedChanges, message]
  );
};

