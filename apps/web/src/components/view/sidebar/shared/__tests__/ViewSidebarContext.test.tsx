import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import {
  ViewSidebarProvider,
  useViewSidebar
} from "@web/src/components/view/sidebar/shared/ViewSidebarContext";
import { SIDEBAR_COOKIE_NAME } from "@web/src/components/view/sidebar/shared/sidebarPersistence";

let mockIsMobile = false;

jest.mock("@web/src/components/ui/use-mobile", () => ({
  useIsMobile: () => mockIsMobile
}));

function ContextProbe() {
  const {
    isCollapsed,
    openMobile,
    isMobile,
    toggleSidebar,
    setIsCollapsed,
    setOpenMobile
  } = useViewSidebar();

  return (
    <div>
      <div data-testid="collapsed">{String(isCollapsed)}</div>
      <div data-testid="open-mobile">{String(openMobile)}</div>
      <div data-testid="is-mobile">{String(isMobile)}</div>
      <button onClick={toggleSidebar}>toggle</button>
      <button onClick={() => setIsCollapsed(true)}>set-collapsed</button>
      <button onClick={() => setOpenMobile(true)}>set-open-mobile</button>
    </div>
  );
}

describe("ViewSidebarContext", () => {
  const clearSidebarCookie = () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
  };

  beforeEach(() => {
    mockIsMobile = false;
    clearSidebarCookie();
  });

  it("throws when hook is used outside provider", () => {
    expect(() => renderHook(() => useViewSidebar())).toThrow(
      "useViewSidebar must be used within a ViewSidebarProvider."
    );
  });

  it("uses defaultCollapsed when cookie is absent", () => {
    render(
      <ViewSidebarProvider defaultCollapsed>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
  });

  it("prefers cookie state over defaultCollapsed", () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=expanded; path=/`;

    render(
      <ViewSidebarProvider defaultCollapsed>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
  });

  it("reads collapsed cookie state", () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=collapsed; path=/`;

    render(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
  });

  it("toggles collapsed state and persists cookie on desktop", () => {
    render(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=collapsed`);
  });

  it("persists expanded cookie when explicitly setting uncollapsed", () => {
    render(
      <ViewSidebarProvider defaultCollapsed>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=expanded`);
  });

  it("toggles mobile drawer instead of collapsed state on mobile", () => {
    mockIsMobile = true;

    render(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByTestId("is-mobile")).toHaveTextContent("true");
    expect(screen.getByTestId("open-mobile")).toHaveTextContent("true");
    expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
  });

  it("handles keyboard shortcut to toggle sidebar", () => {
    render(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
    });

    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
  });

  it("closes mobile drawer when viewport switches to desktop", () => {
    mockIsMobile = true;

    const { rerender } = render(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    fireEvent.click(screen.getByText("set-open-mobile"));
    expect(screen.getByTestId("open-mobile")).toHaveTextContent("true");

    mockIsMobile = false;
    rerender(
      <ViewSidebarProvider>
        <ContextProbe />
      </ViewSidebarProvider>
    );

    expect(screen.getByTestId("open-mobile")).toHaveTextContent("false");
  });
});
