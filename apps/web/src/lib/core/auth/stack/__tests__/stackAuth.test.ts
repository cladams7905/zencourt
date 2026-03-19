const ORIGINAL_ENV = process.env;

jest.mock("@stackframe/stack", () => {
  return {
    StackClientApp: jest.fn(),
    StackServerApp: jest.fn()
  };
});

describe("stack auth core", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws when NEXT_PUBLIC_STACK_PROJECT_ID is missing (client)", async () => {
    delete process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

    const { getStackClientApp } = await import(
      "@web/src/lib/core/auth/stack/client"
    );

    expect(() => getStackClientApp()).toThrow(/NEXT_PUBLIC_STACK_PROJECT_ID/);
  });

  it("creates and caches StackClientApp (client)", async () => {
    const { StackClientApp } = await import("@stackframe/stack");
    const stackClientAppMock = StackClientApp as unknown as jest.Mock;

    process.env.NEXT_PUBLIC_STACK_PROJECT_ID = "proj-1";
    stackClientAppMock.mockImplementation(() => ({ kind: "client" }));

    const { getStackClientApp } = await import(
      "@web/src/lib/core/auth/stack/client"
    );

    const first = getStackClientApp();
    const second = getStackClientApp();

    expect(stackClientAppMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ kind: "client" });
    expect(second).toEqual({ kind: "client" });

    const passedOptions = stackClientAppMock.mock.calls[0][0];
    expect(passedOptions).toMatchObject({
      tokenStore: "nextjs-cookie",
      urls: expect.objectContaining({
        afterSignIn: "/welcome",
        home: "/welcome",
        emailVerification: "/verify-email"
      })
    });
  });

  it("creates and caches StackServerApp and delegates getUser (server)", async () => {
    const { StackClientApp, StackServerApp } = await import("@stackframe/stack");
    const stackClientAppMock = StackClientApp as unknown as jest.Mock;
    const stackServerAppMock = StackServerApp as unknown as jest.Mock;

    process.env.NEXT_PUBLIC_STACK_PROJECT_ID = "proj-1";

    const clientInstance = { kind: "client-instance" };
    stackClientAppMock.mockImplementation(() => clientInstance);

    const getUserMock = jest.fn().mockResolvedValue({ id: "user-1" });
    stackServerAppMock.mockImplementation(() => ({
      getUser: getUserMock
    }));

    const { stackServerApp } = await import(
      "@web/src/lib/core/auth/stack/server"
    );

    const first = await stackServerApp.getUser("auth-token-1" as any);
    const second = await stackServerApp.getUser("auth-token-2" as any);

    expect(StackServerApp).toHaveBeenCalledTimes(1);
    expect(getUserMock).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ id: "user-1" });
    expect(second).toEqual({ id: "user-1" });

    const passedOptions = stackServerAppMock.mock.calls[0][0];
    expect(passedOptions).toMatchObject({
      inheritsFrom: clientInstance,
      urls: expect.objectContaining({
        afterSignUp: "/check-inbox",
        afterSignOut: "/handler/sign-in"
      })
    });
  });
});

