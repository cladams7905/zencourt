import {
  getCookie,
  setCookie,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME
} from "@web/src/components/view/sidebar/shared/sidebarPersistence";

describe("sidebarPersistence", () => {
  const clearCookie = (name: string) => {
    document.cookie = `${name}=; path=/; max-age=0`;
  };

  beforeEach(() => {
    clearCookie("test_cookie");
    clearCookie(SIDEBAR_COOKIE_NAME);
  });

  it("exports expected cookie constants", () => {
    expect(SIDEBAR_COOKIE_NAME).toBe("view_sidebar_state");
    expect(SIDEBAR_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7);
  });

  it("sets and reads cookies", () => {
    setCookie("test_cookie", "hello", 60);

    expect(getCookie("test_cookie")).toBe("hello");
  });

  it("returns undefined for missing cookies", () => {
    expect(getCookie("missing_cookie")).toBeUndefined();
  });
});
