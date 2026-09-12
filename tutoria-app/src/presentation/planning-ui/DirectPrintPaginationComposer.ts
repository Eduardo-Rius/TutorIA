/**
 * DIRECT PRINT PAGINATION COMPOSER
 *
 * Implements authoritative physical Letter geometry composition:
 * - Letter paper: 215.9mm x 279.4mm
 * - Safe margins: 15mm top, bottom, left, right
 * - Usable width: 185.9mm (215.9mm - 30mm)
 * - Usable height: 249.4mm (279.4mm - 30mm)
 *
 * Provides:
 * 1. Canonical Reverso 2-page split (Page 1: 19 PDAs, Page 2: 21 PDAs)
 * 2. Deterministic Anverso semantic block page composition based on measured heights
 * 3. Failure safety gate
 */

export const LETTER_WIDTH_MM = 215.9;
export const LETTER_HEIGHT_MM = 279.4;
export const SAFE_MARGIN_MM = 15.0;
export const USABLE_WIDTH_MM = 185.9;
export const USABLE_HEIGHT_MM = 249.4;

export const REVERSO_PAGE_1_PDA_COUNT = 19;
export const REVERSO_PAGE_2_PDA_COUNT = 21;
export const REVERSO_TOTAL_PDA_COUNT = 40;

export interface AnversoBlockDescriptor {
  id: string;
  type:
    | 'header'
    | 'observations'
    | 'activities_heading'
    | 'activity'
    | 'evaluation'
    | 'complementary'
    | 'materials'
    | 'practices'
    | 'signatures';
  heightMm: number;
  keepWithNext?: boolean;
}

export interface ComposedAnversoPage {
  pageNumber: number;
  blockIds: string[];
  totalHeightMm: number;
  isOversizedFallback?: boolean;
  hasContinuationHeader?: boolean;
}

export interface CompositionResult {
  success: boolean;
  errorMessage?: string;
  pages: ComposedAnversoPage[];
}

/**
 * Validates measured heights.
 * If any height is <= 0, NaN, or infinite, measurement is deemed corrupted/failed.
 */
export function validateBlockMeasurements(
  blocks: AnversoBlockDescriptor[],
  continuationHeaderHeightMm: number
): { valid: boolean; error?: string } {
  if (!blocks || blocks.length === 0) {
    return { valid: false, error: 'No se encontraron bloques semánticos para medir.' };
  }
  if (
    continuationHeaderHeightMm <= 0 ||
    isNaN(continuationHeaderHeightMm) ||
    !isFinite(continuationHeaderHeightMm)
  ) {
    return {
      valid: false,
      error: 'La altura del encabezado de continuación es inválida.',
    };
  }

  for (const b of blocks) {
    if (b.heightMm <= 0 || isNaN(b.heightMm) || !isFinite(b.heightMm)) {
      return {
        valid: false,
        error: `Altura inválida detectada en el bloque semántico: ${b.id} (${b.heightMm}mm)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Packs Anverso semantic blocks sequentially into explicit physical pages.
 *
 * Rules:
 * - Page 1 usable height = usableHeightMm (249.4mm).
 * - Page 2+ usable height = usableHeightMm - continuationHeaderHeightMm.
 * - If block has keepWithNext and it + nextBlock cannot fit on current page,
 *   the block moves together with nextBlock to the next page (no orphaned headings).
 * - If a single block alone exceeds the usable page height, it is placed alone on
 *   that page as a controlled oversized fallback (no truncation, no overflow:hidden).
 */
export function composeAnversoPages(
  blocks: AnversoBlockDescriptor[],
  continuationHeaderHeightMm = 18.0,
  usableHeightMm = USABLE_HEIGHT_MM
): CompositionResult {
  const validation = validateBlockMeasurements(blocks, continuationHeaderHeightMm);
  if (!validation.valid) {
    return {
      success: false,
      errorMessage:
        'No fue posible preparar la paginación segura del documento. Intenta generar nuevamente la versión de impresión.',
      pages: [],
    };
  }

  const pages: ComposedAnversoPage[] = [];
  let currentPageBlocks: string[] = [];
  let currentHeight = 0;
  let pageNumber = 1;

  const getAvailableHeight = (pageNum: number) => {
    return pageNum === 1
      ? usableHeightMm
      : usableHeightMm - continuationHeaderHeightMm;
  };

  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i]!;
    const maxCapacity = getAvailableHeight(pageNumber);
    const available = maxCapacity - currentHeight;

    // Check keepWithNext condition
    let requiredHeight = block.heightMm;
    if (block.keepWithNext && i + 1 < blocks.length) {
      requiredHeight += blocks[i + 1]!.heightMm;
    }

    if (requiredHeight <= available) {
      // Both block (and its next sibling if keepWithNext) fit on current page
      currentPageBlocks.push(block.id);
      currentHeight += block.heightMm;
      i++;
    } else if (block.heightMm <= available && !block.keepWithNext) {
      // Normal single block fits
      currentPageBlocks.push(block.id);
      currentHeight += block.heightMm;
      i++;
    } else {
      // Block (or heading+content pair) does NOT fit in remaining space
      if (currentPageBlocks.length > 0) {
        // Close current page and start a new physical page
        pages.push({
          pageNumber,
          blockIds: currentPageBlocks,
          totalHeightMm: currentHeight,
          hasContinuationHeader: pageNumber > 1,
        });
        pageNumber++;
        currentPageBlocks = [];
        currentHeight = 0;
        // Re-evaluate current block on the new fresh page
      } else {
        // Block is alone on an empty page and still exceeds capacity: OVERSIZED BLOCK
        pages.push({
          pageNumber,
          blockIds: [block.id],
          totalHeightMm: block.heightMm,
          isOversizedFallback: true,
          hasContinuationHeader: pageNumber > 1,
        });
        pageNumber++;
        currentPageBlocks = [];
        currentHeight = 0;
        i++;
      }
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push({
      pageNumber,
      blockIds: currentPageBlocks,
      totalHeightMm: currentHeight,
      hasContinuationHeader: pageNumber > 1,
    });
  }

  return {
    success: true,
    pages,
  };
}
