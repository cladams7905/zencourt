const mockLoadRougeScript = jest.fn();
const mockLoadGwendolyn = jest.fn();
const mockLoadOpenSans = jest.fn();
const mockLoadDMSerifText = jest.fn();
const mockLoadNotoSerifDisplay = jest.fn();
const mockLoadOnest = jest.fn();
const mockLoadPlusJakartaSans = jest.fn();

jest.mock("@remotion/google-fonts/RougeScript", () => ({
  loadFont: (...args: unknown[]) => mockLoadRougeScript(...args)
}));

jest.mock("@remotion/google-fonts/Gwendolyn", () => ({
  loadFont: (...args: unknown[]) => mockLoadGwendolyn(...args)
}));

jest.mock("@remotion/google-fonts/OpenSans", () => ({
  loadFont: (...args: unknown[]) => mockLoadOpenSans(...args)
}));

jest.mock("@remotion/google-fonts/DMSerifText", () => ({
  loadFont: (...args: unknown[]) => mockLoadDMSerifText(...args)
}));

jest.mock("@remotion/google-fonts/NotoSerifDisplay", () => ({
  loadFont: (...args: unknown[]) => mockLoadNotoSerifDisplay(...args)
}));

jest.mock("@remotion/google-fonts/Onest", () => ({
  loadFont: (...args: unknown[]) => mockLoadOnest(...args)
}));

jest.mock("@remotion/google-fonts/PlusJakartaSans", () => ({
  loadFont: (...args: unknown[]) => mockLoadPlusJakartaSans(...args)
}));

describe("ListingVideo font loading", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("loads only the overlay font weights and subsets used by the composition", async () => {
    await import("@/services/render/providers/remotion/composition/ListingVideo");

    expect(mockLoadRougeScript).toHaveBeenCalledWith("normal", {
      weights: ["400"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadGwendolyn).toHaveBeenCalledWith("normal", {
      weights: ["700"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadOpenSans).toHaveBeenCalledWith("normal", {
      weights: ["600", "700"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadDMSerifText).toHaveBeenCalledWith("normal", {
      weights: ["400"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadNotoSerifDisplay).toHaveBeenCalledWith("normal", {
      weights: ["400"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadOnest).toHaveBeenCalledWith("normal", {
      weights: ["400", "500", "600"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
    expect(mockLoadPlusJakartaSans).toHaveBeenCalledWith("normal", {
      weights: ["400", "700"],
      subsets: ["latin"],
      ignoreTooManyRequestsWarning: true
    });
  });
});
