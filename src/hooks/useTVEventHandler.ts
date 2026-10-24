import { useEffect, useRef } from 'react';
import { TVEventHandler } from 'react-native';

interface TVEventHandlers {
  onSelect?: () => void;
  onPlayPause?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onBack?: () => void;
  onMenu?: () => void;
}

export const useTVEventHandler = (handlers: TVEventHandlers) => {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (
      typeof TVEventHandler === 'undefined' ||
      typeof TVEventHandler.addListener !== 'function'
    ) {
      return;
    }

    const subscription = TVEventHandler.addListener(evt => {
      if (!evt?.eventType) {
        return;
      }

      const currentHandlers = handlersRef.current;

      switch (evt.eventType) {
        case 'select':
          currentHandlers.onSelect?.();
          break;
        case 'playPause':
          currentHandlers.onPlayPause?.();
          break;
        case 'up':
          currentHandlers.onUp?.();
          break;
        case 'down':
          currentHandlers.onDown?.();
          break;
        case 'left':
          currentHandlers.onLeft?.();
          break;
        case 'right':
          currentHandlers.onRight?.();
          break;
        case 'back':
          currentHandlers.onBack?.();
          break;
        case 'menu':
          currentHandlers.onMenu?.();
          break;
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);
};
