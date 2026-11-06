import { useEffect, useRef } from 'react';
import {
  useTVEventHandler as useNativeTVEventHandler,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

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
  const isFocused = useIsFocused();

  const handlersRef = useRef(handlers);
  const isFocusedRef = useRef(isFocused);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    isFocusedRef.current = isFocused;

    console.log('[TV HOOK] Screen focus changed:', isFocused);
  }, [isFocused]);

  useNativeTVEventHandler(evt => {
    // أولًا: نسجل أي حدث وصل، حتى لو الشاشة مش Active.
    console.log('[TV RAW EVENT]', evt);

    if (!evt?.eventType) return;

    // ثانيًا: نسمح للشاشة الحالية فقط بالتعامل مع الحدث.
    if (!isFocusedRef.current) {
      console.log('[TV EVENT IGNORED] Screen is not focused');
      return;
    }

    console.log('[TV ACTIVE EVENT]', evt.eventType);

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
};