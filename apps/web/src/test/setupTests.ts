import * as React from "react";
import "@testing-library/jest-dom";

Object.defineProperty(global, "ResizeObserver", {
  writable: true,
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
});

let uuidCounter = 0;
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => `test-uuid-${uuidCounter++}`
  }
});

Object.defineProperty(global, "URL", {
  value: {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  }
});

jest.mock("next/image", () => ({
  __esModule: true,
  default: (
    props: React.ComponentProps<"img"> & { onLoadingComplete?: () => void }
  ) => {
    const { onLoadingComplete: _onLoadingComplete, ...rest } = props;
    return React.createElement("img", rest);
  }
}));
