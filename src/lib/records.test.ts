import { describe, expect, it } from "vitest";
import { toPlainObject } from "./records";

describe("server record serialization", () => {
  it("converts a null-prototype database row into a React-safe plain object", () => {
    const row = Object.assign(Object.create(null), { id: "session-1", status: "OPEN" });
    const plain = toPlainObject(row);
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
    expect(plain).toEqual({ id: "session-1", status: "OPEN" });
  });

  it("converts nested rows and arrays, not only the outer record", () => {
    const row = Object.assign(Object.create(null), {
      id: "record-1",
      media: [Object.assign(Object.create(null), { id: "media-1" })],
      review: Object.assign(Object.create(null), { flags: [Object.assign(Object.create(null), { name: "hallucination" })] }),
    });
    const plain = toPlainObject(row);
    expect(Object.getPrototypeOf(plain.media[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(plain.review)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(plain.review.flags[0])).toBe(Object.prototype);
  });
});
