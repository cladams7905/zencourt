import { ApiError, StatusCode } from "../api";

describe("errors/api", () => {
  it("constructs ApiError with status/body", () => {
    const err = new ApiError(400, { error: "Bad", message: "bad request" });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(400);
    expect(err.body).toEqual({ error: "Bad", message: "bad request" });
    expect(err.message).toBe("bad request");
  });

  it("re-exports StatusCode enum", () => {
    expect(StatusCode.BAD_REQUEST).toBe(400);
  });
});
