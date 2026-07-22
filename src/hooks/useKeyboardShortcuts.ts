import { useEffect } from 'react';

interface Props {
  onUndo: () => void;
  onRedo: () => void;
  onSpaceDown: () => void;
  onSpaceUp: () => void;
}

export function useKeyboardShortcuts({ onUndo, onRedo, onSpaceDown, onSpaceUp }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        onSpaceDown();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          onUndo();
        } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
          e.preventDefault();
          onRedo();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        onSpaceUp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onUndo, onRedo, onSpaceDown, onSpaceUp]);
}
