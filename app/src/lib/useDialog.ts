import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for the camera and sync sheets: focus moves in on open, Tab
 * cycles inside, Escape closes, and focus returns to whatever opened it.
 *
 * Without the restore step a rep who closes the camera lands back at the top of
 * the document and has to tab through the whole header again — which on a
 * keyboard or a switch device is the difference between usable and not.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;

    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;

      const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) return;

      const edge = e.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement === edge) {
        e.preventDefault();
        (e.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return ref;
}
