import { describe, it, expect } from "vitest";
import { renderTemplate } from "./templates";

describe("renderTemplate", () => {
  it("replaces known variables", () => {
    const result = renderTemplate("Hello {{clientName}}, your booking is at {{dateTime}}.", {
      clientName: "Maya",
      dateTime: "March 15, 2026 at 2:00 PM",
    });
    expect(result).toBe("Hello Maya, your booking is at March 15, 2026 at 2:00 PM.");
  });

  it("leaves unknown variables as-is", () => {
    const result = renderTemplate("Hello {{clientName}}, {{unknownVar}} here.", {
      clientName: "Maya",
    });
    expect(result).toBe("Hello Maya, {{unknownVar}} here.");
  });

  it("handles template with no variables", () => {
    const result = renderTemplate("No variables here.", { clientName: "Maya" });
    expect(result).toBe("No variables here.");
  });

  it("handles empty vars object", () => {
    const result = renderTemplate("Hello {{clientName}}.", {});
    expect(result).toBe("Hello {{clientName}}.");
  });

  it("handles empty template string", () => {
    const result = renderTemplate("", { clientName: "Maya" });
    expect(result).toBe("");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = renderTemplate("{{name}} loves {{name}}.", { name: "NailBook" });
    expect(result).toBe("NailBook loves NailBook.");
  });

  it("handles variable values with special characters", () => {
    const result = renderTemplate("Price: {{total}}", { total: "$75.00" });
    expect(result).toBe("Price: $75.00");
  });

  it("does not replace nested braces", () => {
    const result = renderTemplate("{{{clientName}}}", { clientName: "Maya" });
    expect(result).toBe("{Maya}");
  });
});
