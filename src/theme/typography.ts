// export const typography = {
//   // Headings
//   h1: {
//     fontSize: 32,
//     fontWeight: '700' as const,
//     lineHeight: 40,
//     letterSpacing: -0.5,

//   },
//   h2: {
//     fontSize: 24,
//     fontWeight: '700' as const,
//     lineHeight: 32,
//     letterSpacing: -0.3,
//   },
//   h3: {
//     fontSize: 20,
//     fontWeight: '600' as const,
//     lineHeight: 28,
//     letterSpacing: -0.2,
//   },
//   h4: {
//     fontSize: 18,
//     fontWeight: '600' as const,
//     lineHeight: 24,
//   },
  
//   // Body text
//   body: {
//     fontSize: 16,
//     fontWeight: '400' as const,
//     lineHeight: 24,
//   },
//   bodySmall: {
//     fontSize: 14,
//     fontWeight: '400' as const,
//     lineHeight: 20,
//   },
//   bodyLarge: {
//     fontSize: 18,
//     fontWeight: '400' as const,
//     lineHeight: 28,
//   },
  
//   // Labels
//   label: {
//     fontSize: 14,
//     fontWeight: '500' as const,
//     lineHeight: 20,
//   },
//   labelSmall: {
//     fontSize: 12,
//     fontWeight: '500' as const,
//     lineHeight: 16,
//   },
  
//   // Captions
//   caption: {
//     fontSize: 12,
//     fontWeight: '400' as const,
//     lineHeight: 16,
//   },
  
//   // Buttons
//   button: {
//     fontSize: 16,
//     fontWeight: '600' as const,
//     lineHeight: 24,
//   },
//   buttonSmall: {
//     fontSize: 14,
//     fontWeight: '600' as const,
//     lineHeight: 20,
//   },
// };




import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

const screenWidth = Math.min(width, height);

type DeviceSize = 'mobile' | 'tablet' | 'large';

const deviceSize: DeviceSize =
  screenWidth < 600
    ? 'mobile'
    : screenWidth < 900
      ? 'tablet'
      : 'large';

const fontSizes = {
  mobile: {
    h1: 18,
    h2: 17,
    h3: 16,
    h4: 15,
    body: 14,
    bodySmall: 12,
    bodyLarge: 16,
    label: 12,
    labelSmall: 10,
    caption: 10,
    button: 14,
    buttonSmall: 12,
  },

  tablet: {
    h1: 26,
    h2: 21,
    h3: 18,
    h4: 17,
    body: 15,
    bodySmall: 13,
    bodyLarge: 17,
    label: 13,
    labelSmall: 11,
    caption: 11,
    button: 15,
    buttonSmall: 13,
  },

  large: {
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 18,
    body: 16,
    bodySmall: 14,
    bodyLarge: 18,
    label: 14,
    labelSmall: 12,
    caption: 12,
    button: 16,
    buttonSmall: 14,
  },
};

const scale = (size: number) =>
  PixelRatio.roundToNearestPixel(size);

const createTextStyle = (
  size: number,
  weight: '400' | '500' | '600' | '700',
  lineHeightRatio: number,
  letterSpacing = 0,
) => ({
  fontSize: scale(size),
  fontWeight: weight,
  lineHeight: scale(size * lineHeightRatio),
  ...(letterSpacing !== 0 && {
    letterSpacing: scale(letterSpacing),
  }),
});

const sizes = fontSizes[deviceSize];

export const typography = {
  h1: createTextStyle(sizes.h1, '700', 1.25, -0.5),
  h2: createTextStyle(sizes.h2, '700', 1.33, -0.3),
  h3: createTextStyle(sizes.h3, '600', 1.4, -0.2),
  h4: createTextStyle(sizes.h4, '600', 1.33),

  body: createTextStyle(sizes.body, '400', 1.5),
  bodySmall: createTextStyle(sizes.bodySmall, '400', 1.43),
  bodyLarge: createTextStyle(sizes.bodyLarge, '400', 1.56),

  label: createTextStyle(sizes.label, '500', 1.43),
  labelSmall: createTextStyle(sizes.labelSmall, '500', 1.33),

  caption: createTextStyle(sizes.caption, '400', 1.33),

  button: createTextStyle(sizes.button, '600', 1.5),
  buttonSmall: createTextStyle(sizes.buttonSmall, '600', 1.43),
};
