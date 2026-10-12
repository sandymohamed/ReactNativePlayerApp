// /**
//  * Landscape-oriented layout helpers for phones and TVs.
//  * App enforces landscape; use these for sidebar, grid columns, and card sizes.
//  */

// import {useWindowDimensions} from 'react-native';
// import {spacing} from '../theme/spacing';

// export const SIDEBAR_WIDTH = 200;
// export const CONTENT_PAD_H = spacing.xl;
// export const GRID_GAP = spacing.md;
// export const MIN_CARD_WIDTH = 200;

// /**
//  * Num columns for content grid (Movies, Series) based on content width.
//  * Content width = full width - sidebar - horizontal padding.
//  */
// export function getNumColumns(contentWidth: number): number {
//   const available = contentWidth - CONTENT_PAD_H * 2;
//   const colWidth = MIN_CARD_WIDTH + GRID_GAP;
//   const n = Math.floor(available / colWidth) || 1;
//   return Math.max(1, Math.min(n, 6));
// }

// /**
//  * Card width for a grid with numColumns (including gaps between columns).
//  */
// export function getCardWidth(contentWidth: number, numColumns: number): number {
//   const available = contentWidth - CONTENT_PAD_H * 2;
//   const totalGap = (numColumns - 1) * GRID_GAP;
//   const w = (available - totalGap) / numColumns;
//   return Math.max(MIN_CARD_WIDTH, w);
// }

// /**
//  * Main screen grid: 3 columns for landscape.
//  */
// export function getMainGridNumColumns(screenWidth: number): number {
//   const pad = spacing.xl * 2;
//   const available = screenWidth - pad;
//   const minCard = 220;
//   const n = Math.floor(available / minCard) || 1;
//   return Math.max(2, Math.min(n, 4));
// }

// export function getMainCardWidth(screenWidth: number, numColumns: number): number {
//   const pad = spacing.md * 2;
//   const gap = spacing.lg;
//   const available = screenWidth - pad - gap;
//   const totalGap = (numColumns - 1) * gap;
//   return (available - totalGap) / numColumns;
// }

// export function useLandscapeLayout() {
//   const {width, height} = useWindowDimensions();
//   const contentWidth = width - SIDEBAR_WIDTH;
//   const numColumns = getNumColumns(contentWidth);
//   const cardWidth = getCardWidth(contentWidth, numColumns);
//   const mainNumColumns = getMainGridNumColumns(width);
//   const mainCardWidth = getMainCardWidth(width, mainNumColumns);
//   return {
//     width,
//     height,
//     sidebarWidth: SIDEBAR_WIDTH,
//     contentWidth,
//     numColumns,
//     cardWidth,
//     mainNumColumns,
//     mainCardWidth,
//   };
// }




/**
 * Landscape-oriented layout helpers for phones and TVs.
 * TV sizing preserves the existing layout.
 * Mobile uses a narrower sidebar and smaller cards.
 */

import {Platform, useWindowDimensions} from 'react-native';
import {spacing} from '../theme/spacing';

export const SIDEBAR_WIDTH = 200;
export const CONTENT_PAD_H = spacing.xl;
export const GRID_GAP = spacing.md;
export const MIN_CARD_WIDTH = 200;

// Mobile sizing
export const MOBILE_SIDEBAR_WIDTH = 105;
export const MOBILE_CONTENT_PAD_H = spacing.sm;
export const MOBILE_GRID_GAP = spacing.sm;
export const MOBILE_MIN_CARD_WIDTH = 100;

export function getNumColumns(contentWidth: number): number {
  const available = contentWidth - CONTENT_PAD_H * 2;
  const colWidth = MIN_CARD_WIDTH + GRID_GAP;
  const n = Math.floor(available / colWidth) || 1;
  return Math.max(1, Math.min(n, 6));
}

export function getCardWidth(
  contentWidth: number,
  numColumns: number,
): number {
  const available = contentWidth - CONTENT_PAD_H * 2;
  const totalGap = (numColumns - 1) * GRID_GAP;
  const w = (available - totalGap) / numColumns;
  return Math.max(MIN_CARD_WIDTH, w);
}

/**
 * Mobile grid helpers.
 * Calculate sizes from the actual available content width.
 */
export function getMobileNumColumns(contentWidth: number): number {
  const available =
    contentWidth - MOBILE_CONTENT_PAD_H * 2;

  const colWidth = MOBILE_MIN_CARD_WIDTH + MOBILE_GRID_GAP;
  const n = Math.floor(
    (available + MOBILE_GRID_GAP) / colWidth,
  ) || 1;

  return Math.max(1, Math.min(n, 4));
}

export function getMobileCardWidth(
  contentWidth: number,
  numColumns: number,
): number {
  const available =
    contentWidth - MOBILE_CONTENT_PAD_H * 2;

  const totalGap = (numColumns - 1) * MOBILE_GRID_GAP;

  return Math.max(
    1,
    (available - totalGap) / numColumns,
  );
}

/**
 * Main screen grid: unchanged TV behavior.
 */
export function getMainGridNumColumns(screenWidth: number): number {
  const pad = spacing.xl * 2;
  const available = screenWidth - pad;
  const minCard = 220;
  const n = Math.floor(available / minCard) || 1;
  return Math.max(2, Math.min(n, 4));
}

export function getMainCardWidth(
  screenWidth: number,
  numColumns: number,
): number {
  const pad = spacing.md * 2;
  const gap = spacing.md;
  const available = screenWidth - pad - gap;
  const totalGap = (numColumns - 1) * gap;
  return (available - totalGap) / numColumns;
}

export function useLandscapeLayout() {
  const {width, height} = useWindowDimensions();
  const isTV = Platform.isTV;

  // Keep the original TV calculations unchanged.
  const sidebarWidth = isTV
    ? SIDEBAR_WIDTH
    : MOBILE_SIDEBAR_WIDTH;

  const contentWidth = width - sidebarWidth;

  const numColumns = isTV
    ? getNumColumns(contentWidth)
    : getMobileNumColumns(contentWidth);

  const cardWidth = isTV
    ? getCardWidth(contentWidth, numColumns)
    : getMobileCardWidth(contentWidth, numColumns);

  // Keep the existing main-grid calculations unchanged for TV.
  const mainNumColumns = getMainGridNumColumns(width);
  const mainCardWidth = getMainCardWidth(
    width,
    mainNumColumns,
  );

  return {
    width,
    height,
    isTV,
    isMobile: !isTV,
    sidebarWidth,
    contentWidth,
    numColumns,
    cardWidth,
    mainNumColumns,
    mainCardWidth,

    // Expose responsive spacing to screens that need it.
    contentPadding: isTV
      ? CONTENT_PAD_H
      : MOBILE_CONTENT_PAD_H,

    gridGap: isTV
      ? GRID_GAP
      : MOBILE_GRID_GAP,

    minCardWidth: isTV
      ? MIN_CARD_WIDTH
      : MOBILE_MIN_CARD_WIDTH,
  };
}
