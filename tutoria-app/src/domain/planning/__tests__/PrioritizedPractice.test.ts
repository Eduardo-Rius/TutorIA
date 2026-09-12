import { describe, it, expect } from "vitest";
import {
  PrioritizedPractice,
  validatePrioritizedPractice,
  validatePrioritizedPractices,
  InvalidPrioritizedPracticeError,
} from "../PrioritizedPractice";

describe("PrioritizedPractice Value Object Domain Tests (H1R9-F.7.1)", () => {
  it("20. TEST — EMPTY: empty array [] is valid and normal", () => {
    const result = validatePrioritizedPractices([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("21. TEST — SINGLE: validates and trims valid practiceName", () => {
    const raw: PrioritizedPractice = {
      practiceName: "  Lectura en voz alta y señalización compartida  ",
    };

    const validated = validatePrioritizedPractice(raw);
    expect(validated.practiceName).toBe("Lectura en voz alta y señalización compartida");
    expect(validated.sourceReference).toBeUndefined();
  });

  it("22. TEST — OPTIONAL SOURCE: preserves sourceReference when provided and trims it", () => {
    const raw: PrioritizedPractice = {
      practiceName: "  Estimulación del lenguaje en tiempos de alimentación  ",
      sourceReference: "   Asesoría Pedagógica IMSS 2026 - Oficio 12/B   ",
    };

    const validated = validatePrioritizedPractice(raw);
    expect(validated.practiceName).toBe("Estimulación del lenguaje en tiempos de alimentación");
    expect(validated.sourceReference).toBe("Asesoría Pedagógica IMSS 2026 - Oficio 12/B");
  });

  it("23. TEST — MULTIPLE: supports 0..N practices preserving order and properties", () => {
    const list: PrioritizedPractice[] = [
      { practiceName: "Práctica 1", sourceReference: "Ref 1" },
      { practiceName: "Práctica 2" },
      { practiceName: "Práctica 3", sourceReference: "Ref 3" },
    ];

    const validated = validatePrioritizedPractices(list);
    expect(validated).toHaveLength(3);
    expect(validated[0].practiceName).toBe("Práctica 1");
    expect(validated[0].sourceReference).toBe("Ref 1");
    expect(validated[1].practiceName).toBe("Práctica 2");
    expect(validated[1].sourceReference).toBeUndefined();
    expect(validated[2].practiceName).toBe("Práctica 3");
  });

  it("24. TEST — INVALID: rejects null, undefined, non-object, blank and whitespace-only practiceName", () => {
    expect(() => validatePrioritizedPractice(null as any)).toThrow(InvalidPrioritizedPracticeError);
    expect(() => validatePrioritizedPractice(undefined as any)).toThrow(InvalidPrioritizedPracticeError);
    expect(() => validatePrioritizedPractice("string" as any)).toThrow(InvalidPrioritizedPracticeError);

    // Blank
    expect(() => validatePrioritizedPractice({ practiceName: "" })).toThrow(InvalidPrioritizedPracticeError);

    // Whitespace-only
    expect(() => validatePrioritizedPractice({ practiceName: "   \t \n " })).toThrow(InvalidPrioritizedPracticeError);
  });

  it("rejects non-array collections in validatePrioritizedPractices", () => {
    expect(() => validatePrioritizedPractices(null as any)).toThrow(InvalidPrioritizedPracticeError);
    expect(() => validatePrioritizedPractices({} as any)).toThrow(InvalidPrioritizedPracticeError);
  });
});
