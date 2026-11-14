import { useEffect } from 'react';
import { CommandAction } from '../../services/commandPaletteService';

interface CommandCenterShortcutOptions {
  openPalette: () => void;
  executeAction: (action: CommandAction) => void;
}

export const useCommandCenterShortcuts = ({ openPalette, executeAction }: CommandCenterShortcutOptions) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      if (!key) return;

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.altKey && key === 'n') {
        event.preventDefault();
        executeAction('create-task');
        return;
      }

      if (event.altKey && key === 'a') {
        event.preventDefault();
        executeAction('open-approvals');
        return;
      }

      if (event.altKey && key === 'w') {
        event.preventDefault();
        executeAction('trigger-workflow');
        return;
      }

      if (event.altKey && key === 'q') {
        event.preventDefault();
        executeAction('quick-approve');
        return;
      }

      if (event.altKey && key === 'r') {
        event.preventDefault();
        executeAction('bulk-resolve');
        return;
      }

      if (event.altKey && key === 'x') {
        event.preventDefault();
        executeAction('open-realtime-workspace');
        return;
      }

      if (event.altKey && key === 'g') {
        event.preventDefault();
        executeAction('open-collaboration');
        return;
      }

      if (event.altKey && key === 'v') {
        event.preventDefault();
        executeAction('open-governance');
        return;
      }

      if (event.altKey && key === 'l') {
        event.preventDefault();
        executeAction('open-learning');
        return;
      }

      if (event.altKey && key === 'h') {
        event.preventDefault();
        executeAction('create-handoff');
        return;
      }

      if (event.altKey && key === 'f') {
        event.preventDefault();
        executeAction('enter-deep-work');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { mode: 'focus' } }));
        return;
      }

      if (event.altKey && key === 't') {
        event.preventDefault();
        executeAction('enter-rapid-triage');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'triage' } }));
        return;
      }

      if (event.altKey && key === 'm') {
        event.preventDefault();
        executeAction('enter-executive-monitoring');
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'executive' } }));
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey && key === 'j') {
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { queue: 'next' } }));
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey && key === 'k') {
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { queue: 'previous' } }));
        return;
      }

      if (event.altKey && /^[1-8]$/.test(key)) {
        const panels = ['tasks', 'notices', 'intelligence', 'escalations', 'activity', 'alerts', 'collaboration', 'timeline'];
        window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { panel: panels[Number(key) - 1] } }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executeAction, openPalette]);
};
