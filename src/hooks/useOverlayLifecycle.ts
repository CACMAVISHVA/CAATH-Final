import { RefObject, useEffect, useRef } from 'react';

interface OverlayLifecycleOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export const useOverlayLifecycle = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
  initialFocusRef,
}: OverlayLifecycleOptions) => {
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }
      if (restoreFocusRef.current && typeof restoreFocusRef.current.focus === 'function') {
        restoreFocusRef.current.focus();
      }
    };
  }, [isOpen, closeOnEscape, lockScroll, initialFocusRef]);
};
