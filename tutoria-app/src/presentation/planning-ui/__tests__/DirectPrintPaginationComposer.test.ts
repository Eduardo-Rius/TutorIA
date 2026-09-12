import { describe, it, expect } from 'vitest';
import {
  composeAnversoPages,
  validateBlockMeasurements,
  USABLE_HEIGHT_MM,
  USABLE_WIDTH_MM,
  LETTER_WIDTH_MM,
  LETTER_HEIGHT_MM,
  SAFE_MARGIN_MM,
  AnversoBlockDescriptor,
} from '../DirectPrintPaginationComposer';

describe('DirectPrintPaginationComposer (H1R9-F.5.3.14.4)', () => {
  it('1. Physical Geometry Constants: 215.9mm x 279.4mm with 15mm margins yields 185.9mm x 249.4mm usable box', () => {
    expect(LETTER_WIDTH_MM).toBe(215.9);
    expect(LETTER_HEIGHT_MM).toBe(279.4);
    expect(SAFE_MARGIN_MM).toBe(15.0);
    expect(USABLE_WIDTH_MM).toBeCloseTo(185.9, 1);
    expect(USABLE_HEIGHT_MM).toBeCloseTo(249.4, 1);
  });

  it('2. All blocks fit Page 1: when total height <= 249.4mm, produces exactly 1 page', () => {
    const blocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 35 },
      { id: 'obs', type: 'observations', heightMm: 25 },
      { id: 'act_heading', type: 'activities_heading', heightMm: 15, keepWithNext: true },
      { id: 'act_0', type: 'activity', heightMm: 40 },
      { id: 'eval', type: 'evaluation', heightMm: 25 },
      { id: 'comp', type: 'complementary', heightMm: 20 },
      { id: 'mat', type: 'materials', heightMm: 15 },
      { id: 'practices', type: 'practices', heightMm: 15 },
      { id: 'sigs', type: 'signatures', heightMm: 45 },
    ];
    // Total = 35+25+15+40+25+20+15+15+45 = 235mm <= 249.4mm

    const result = composeAnversoPages(blocks, 18.0, USABLE_HEIGHT_MM);
    expect(result.success).toBe(true);
    expect(result.pages.length).toBe(1);
    expect(result.pages[0]!.pageNumber).toBe(1);
    expect(result.pages[0]!.blockIds.length).toBe(9);
    expect(result.pages[0]!.totalHeightMm).toBe(235);
    expect(result.pages[0]!.hasContinuationHeader).toBeFalsy();
  });

  it('3. One block forces Page 2: packs Page 1 up to limit, moves subsequent blocks to Page 2 with continuation header', () => {
    const blocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 40 },
      { id: 'obs', type: 'observations', heightMm: 40 },
      { id: 'act_0', type: 'activity', heightMm: 60 },
      { id: 'act_1', type: 'activity', heightMm: 60 },
      // Used so far on P1: 40+40+60+60 = 200mm. Available on P1: 249.4 - 200 = 49.4mm.
      // Next block is 60mm -> does NOT fit on P1 (60 > 49.4). Must move to P2.
      { id: 'act_2', type: 'activity', heightMm: 60 },
      { id: 'sigs', type: 'signatures', heightMm: 50 },
    ];

    const result = composeAnversoPages(blocks, 18.0, USABLE_HEIGHT_MM);
    expect(result.success).toBe(true);
    expect(result.pages.length).toBe(2);

    // Page 1
    expect(result.pages[0]!.pageNumber).toBe(1);
    expect(result.pages[0]!.blockIds).toEqual(['header', 'obs', 'act_0', 'act_1']);
    expect(result.pages[0]!.totalHeightMm).toBe(200);
    expect(result.pages[0]!.hasContinuationHeader).toBeFalsy();

    // Page 2
    expect(result.pages[1]!.pageNumber).toBe(2);
    expect(result.pages[1]!.blockIds).toEqual(['act_2', 'sigs']);
    expect(result.pages[1]!.hasContinuationHeader).toBe(true);
  });

  it('4. Heading stays with first content (keepWithNext): prevents orphaned section heading at bottom of page', () => {
    const blocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 50 },
      { id: 'obs', type: 'observations', heightMm: 170 },
      // Remaining on P1: 249.4 - 220 = 29.4mm.
      // Heading is 15mm (fits alone: 15 <= 29.4), but first activity is 40mm (15 + 40 = 55 > 29.4).
      // Because keepWithNext is true, heading MUST move to Page 2 together with act_0!
      { id: 'act_heading', type: 'activities_heading', heightMm: 15, keepWithNext: true },
      { id: 'act_0', type: 'activity', heightMm: 40 },
      { id: 'sigs', type: 'signatures', heightMm: 45 },
    ];

    const result = composeAnversoPages(blocks, 18.0, USABLE_HEIGHT_MM);
    expect(result.success).toBe(true);
    expect(result.pages.length).toBe(2);

    // Page 1 must NOT orphan act_heading
    expect(result.pages[0]!.blockIds).toEqual(['header', 'obs']);

    // Page 2 must start with act_heading followed by act_0
    expect(result.pages[1]!.blockIds).toEqual(['act_heading', 'act_0', 'sigs']);
  });

  it('5. Continuation header consumes capacity on Page 2+: available height is 249.4mm - 18mm = 231.4mm', () => {
    const continuationHeaderHeight = 20.0;
    const usable = 249.4;
    // Page 2 available = 249.4 - 20 = 229.4mm.
    const blocks: AnversoBlockDescriptor[] = [
      { id: 'block_p1', type: 'header', heightMm: 240 },
      // On Page 2: block of 220mm fits (220 <= 229.4), but block of 235mm would NOT fit!
      { id: 'block_p2_1', type: 'activity', heightMm: 200 },
      { id: 'block_p2_2', type: 'activity', heightMm: 35 }, // 200 + 35 = 235 > 229.4 -> forces Page 3
    ];

    const result = composeAnversoPages(blocks, continuationHeaderHeight, usable);
    expect(result.success).toBe(true);
    expect(result.pages.length).toBe(3);
    expect(result.pages[0]!.blockIds).toEqual(['block_p1']);
    expect(result.pages[1]!.blockIds).toEqual(['block_p2_1']);
    expect(result.pages[2]!.blockIds).toEqual(['block_p2_2']);
    expect(result.pages[1]!.hasContinuationHeader).toBe(true);
    expect(result.pages[2]!.hasContinuationHeader).toBe(true);
  });

  it('6. Exact boundary fit vs 1mm-over boundary: precision packaging without magic activity counts', () => {
    const usable = 200.0;
    // Test A: exact fit (80 + 120 = 200.0)
    const exactBlocks: AnversoBlockDescriptor[] = [
      { id: 'b1', type: 'activity', heightMm: 80.0 },
      { id: 'b2', type: 'activity', heightMm: 120.0 },
    ];
    const resA = composeAnversoPages(exactBlocks, 15.0, usable);
    expect(resA.pages.length).toBe(1);

    // Test B: 1mm over boundary (80 + 121 = 201.0 > 200.0)
    const overBlocks: AnversoBlockDescriptor[] = [
      { id: 'b1', type: 'activity', heightMm: 80.0 },
      { id: 'b2', type: 'activity', heightMm: 121.0 },
    ];
    const resB = composeAnversoPages(overBlocks, 15.0, usable);
    expect(resB.pages.length).toBe(2);
    expect(resB.pages[0]!.blockIds).toEqual(['b1']);
    expect(resB.pages[1]!.blockIds).toEqual(['b2']);
  });

  it('7. Controlled Oversized Single Block Fallback: block larger than usable page does not crash or truncate', () => {
    const blocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 40 },
      // An immense single activity of 300mm (> 249.4mm)
      { id: 'immense_act', type: 'activity', heightMm: 300 },
      { id: 'sigs', type: 'signatures', heightMm: 40 },
    ];

    const result = composeAnversoPages(blocks, 18.0, USABLE_HEIGHT_MM);
    expect(result.success).toBe(true);
    expect(result.pages.length).toBe(3);

    // Page 1 has header
    expect(result.pages[0]!.blockIds).toEqual(['header']);
    // Page 2 has the oversized block alone as an oversized fallback
    expect(result.pages[1]!.blockIds).toEqual(['immense_act']);
    expect(result.pages[1]!.isOversizedFallback).toBe(true);
    // Page 3 has signatures
    expect(result.pages[2]!.blockIds).toEqual(['sigs']);
  });

  it('8. Failure Safety Gate: measurement failure (height <= 0, NaN, missing blocks) safely aborts with exact error message', () => {
    // 1. Height is 0
    const zeroHeightBlocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 0 },
    ];
    const resZero = composeAnversoPages(zeroHeightBlocks, 18.0, USABLE_HEIGHT_MM);
    expect(resZero.success).toBe(false);
    expect(resZero.pages.length).toBe(0);
    expect(resZero.errorMessage).toBe(
      'No fue posible preparar la paginación segura del documento. Intenta generar nuevamente la versión de impresión.'
    );

    // 2. Height is NaN
    const nanBlocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: NaN },
    ];
    const resNaN = composeAnversoPages(nanBlocks, 18.0, USABLE_HEIGHT_MM);
    expect(resNaN.success).toBe(false);
    expect(resNaN.pages.length).toBe(0);

    // 3. Continuation header invalid
    const validBlocks: AnversoBlockDescriptor[] = [
      { id: 'header', type: 'header', heightMm: 40 },
    ];
    const resBadHeader = composeAnversoPages(validBlocks, 0, USABLE_HEIGHT_MM);
    expect(resBadHeader.success).toBe(false);
    expect(resBadHeader.pages.length).toBe(0);
  });
});
