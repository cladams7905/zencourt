import {
  DomainDependencyError,
  DomainError,
  DomainValidationError,
  isDomainError
} from "../domain";

describe("errors/domain", () => {
  it("builds base domain errors", () => {
    const err = new DomainError("forbidden", "nope", { scope: "listing" });

    expect(err.kind).toBe("forbidden");
    expect(err.message).toBe("nope");
    expect(err.details).toEqual({ scope: "listing" });
    expect(isDomainError(err)).toBe(true);
  });

  it("builds validation and dependency specializations", () => {
    const validation = new DomainValidationError("bad input");
    const dependency = new DomainDependencyError("upstream failed", {
      provider: "perplexity"
    });

    expect(validation.kind).toBe("validation");
    expect(validation.name).toBe("DomainValidationError");
    expect(dependency.kind).toBe("dependency");
    expect(dependency.name).toBe("DomainDependencyError");
    expect(isDomainError({})).toBe(false);
  });
});
