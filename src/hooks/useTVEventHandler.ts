import {useEffect} from 'react';
import {TVEventHandler} from 'react-native';

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

/**
 * TVEventHandler is undefined on non‑TV Android/iOS. Using it causes
 * "Cannot read property 'prototype' of undefined". Only enable on TV.
 */
export const useTVEventHandler = (handlers: TVEventHandlers) => {
  useEffect(() => {
    if (typeof TVEventHandler === 'undefined') {
      return;
    }
    const tvEventHandler = new TVEventHandler();

    tvEventHandler.enable(null, (cmp, evt) => {
      if (evt && evt.eventType === 'playPause' && handlers.onPlayPause) {
        handlers.onPlayPause();
      } else if (evt && evt.eventType === 'select' && handlers.onSelect) {
        handlers.onSelect();
      } else if (evt && evt.eventType === 'up' && handlers.onUp) {
        handlers.onUp();
      } else if (evt && evt.eventType === 'down' && handlers.onDown) {
        handlers.onDown();
      } else if (evt && evt.eventType === 'left' && handlers.onLeft) {
        handlers.onLeft();
      } else if (evt && evt.eventType === 'right' && handlers.onRight) {
        handlers.onRight();
      } else if (evt && evt.eventType === 'menu' && handlers.onMenu) {
        handlers.onMenu();
      } else if (evt && evt.eventType === 'back' && handlers.onBack) {
        handlers.onBack();
      }
    });

    return () => {
      tvEventHandler.disable();
    };
  }, [handlers]);
};
