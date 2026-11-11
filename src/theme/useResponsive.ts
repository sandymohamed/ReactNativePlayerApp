
import {Platform, useWindowDimensions} from 'react-native';

export type DeviceClass = 'mobile' | 'tablet' | 'tv';

export const useResponsive = () => {
  const {width, height} = useWindowDimensions();

  // Use the shorter side to classify the device.
  // This works correctly with landscape mobile screens.
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  const isTV = Platform.isTV === true;

  const deviceClass: DeviceClass = isTV
    ? 'tv'
    : shortSide < 600
      ? 'mobile'
      : shortSide < 900
        ? 'tablet'
        : 'tv';

  const isMobile = deviceClass === 'mobile';
  const isTablet = deviceClass === 'tablet';

  const sizes = {
    mobile: {
      headerHeight: 44,
      pagePaddingX: 14,
      pagePaddingY: 8,
      sectionGap: 12,
      cardGap: 8,
      cardPadding: 10,
      cardRadius: 10,
      buttonHeight: 36,
      iconSize: 18,
      logoSize: 30,

      font: {
        title: 17,
        subtitle: 11,
        heading: 14,
        body: 12,
        secondary: 11,
        caption: 10,
        button: 12,
      },
    },

    tablet: {
      headerHeight: 56,
      pagePaddingX: 24,
      pagePaddingY: 14,
      sectionGap: 18,
      cardGap: 14,
      cardPadding: 16,
      cardRadius: 12,
      buttonHeight: 44,
      iconSize: 22,
      logoSize: 38,

      font: {
        title: 22,
        subtitle: 13,
        heading: 17,
        body: 14,
        secondary: 13,
        caption: 11,
        button: 14,
      },
    },

    tv: {
      headerHeight: 68,
      pagePaddingX: 36,
      pagePaddingY: 20,
      sectionGap: 24,
      cardGap: 20,
      cardPadding: 22,
      cardRadius: 16,
      buttonHeight: 54,
      iconSize: 28,
      logoSize: 46,

      font: {
        title: 28,
        subtitle: 17,
        heading: 21,
        body: 18,
        secondary: 16,
        caption: 14,
        button: 17,
      },
    },
  }[deviceClass];

  return {
    width,
    height,
    shortSide,
    longSide,

    deviceClass,
    isTV,
    isMobile,
    isTablet,

    ...sizes,
  };
};
