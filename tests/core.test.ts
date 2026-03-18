import { describe, it, expect } from "vitest";
import { Permitflow } from "../src/core.js";
describe("Permitflow", () => {
  it("init", () => { expect(new Permitflow().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Permitflow(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Permitflow(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
