import { describe, expect, it } from "vitest";
import { isValidExperimentDay } from "./prompts";

describe("experiment day bounds", () => {
  it("only accepts the seven seeded days", () => {
    expect(isValidExperimentDay(1)).toBe(true);
    expect(isValidExperimentDay(7)).toBe(true);
    expect(isValidExperimentDay(0)).toBe(false);
    expect(isValidExperimentDay(8)).toBe(false);
  });
});
