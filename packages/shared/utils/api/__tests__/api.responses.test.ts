import { StatusCode } from "@shared/types/api";
import { apiErrorCodeFromStatus, buildApiErrorBody } from "..";

describe("api/responses", () => {
  it("builds api error body with extras", () => {
    expect(
      buildApiErrorBody("NOT_FOUND", "Missing resource", { requestId: "req-1" })
    ).toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Missing resource",
      requestId: "req-1"
    });
  });

  it("maps status codes to api error codes", () => {
    expect(apiErrorCodeFromStatus(StatusCode.UNAUTHORIZED)).toBe(
      "UNAUTHORIZED"
    );
    expect(apiErrorCodeFromStatus(StatusCode.FORBIDDEN)).toBe("FORBIDDEN");
    expect(apiErrorCodeFromStatus(StatusCode.NOT_FOUND)).toBe("NOT_FOUND");
    expect(apiErrorCodeFromStatus(500)).toBe("INVALID_REQUEST");
  });
});
