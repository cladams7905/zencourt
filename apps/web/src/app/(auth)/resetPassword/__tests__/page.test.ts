import { resolveResetPasswordCode } from "@web/src/app/(auth)/resetPassword/resetPasswordCode";
import { URL as NodeURL } from "url";

describe("resolveResetPasswordCode", () => {
  beforeEach(() => {
    Object.defineProperty(global, "URL", {
      writable: true,
      value: NodeURL
    });
  });

  it("prefers direct code parameter", () => {
    expect(
      resolveResetPasswordCode({
        code: "c1",
        token: "t1"
      })
    ).toBe("c1");
  });

  it("falls back through known aliases", () => {
    expect(resolveResetPasswordCode({ verification_code: "v1" })).toBe("v1");
    expect(resolveResetPasswordCode({ verificationCode: "v2" })).toBe("v2");
    expect(resolveResetPasswordCode({ token: "t1" })).toBe("t1");
    expect(resolveResetPasswordCode({ reset_code: "r1" })).toBe("r1");
  });

  it("extracts code from callbackUrl when explicit params are absent", () => {
    expect(
      resolveResetPasswordCode({
        callbackUrl: "https://app.test/reset?verification_code=abc123"
      })
    ).toBe("abc123");
  });

  it("returns empty string for invalid callback URL or missing values", () => {
    expect(
      resolveResetPasswordCode({
        callbackUrl: "not-a-valid-url"
      })
    ).toBe("");
    expect(resolveResetPasswordCode({})).toBe("");
  });
});
