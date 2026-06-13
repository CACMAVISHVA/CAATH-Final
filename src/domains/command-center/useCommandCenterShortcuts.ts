import { useEffect } from 'react';
import { CommandAction } from '../../services/commandPaletteService';

interface CommandCenterShortcutOptions {
  openPalette: () => void;
  executeAction: (action: CommandAction) => void;
}

export const useCommandCenterShortcuts = ({ openPalette, executeAction }: CommandCenterShortcutOptions) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        executeAction('create-task');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        executeAction('open-approvals');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        executeAction('trigger-workflow');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        executeAction('quick-approve');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        executeAction('bulk-resolve');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        executeAction('open-realtime-workspace');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        executeAction('open-collaboration');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        executeAction('open-governance');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        executeAction('open-learning');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        executeAction('create-handoff');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        executeAction('enter-deep-work');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { mode: 'focus' } }));
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        executeAction('enter-rapid-triage');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'triage' } }));
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        executeAction('enter-executive-monitoring');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'executive' } }));
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'j') {
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { queue: 'next' } }));
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'k') {
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { queue: 'previous' } }));
        return;
      }

      if (event.altKey && /^[1-8]$/.test(event.key)) {
        const panels = ['tasks', 'notices', 'intelligence', 'escalations', 'activity', 'alerts', 'collaboration', 'timeline'];
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { panel: panels[Number(event.key) - 1] } }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executeAction, openPalette]);
};
