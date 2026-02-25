import * as React from "react";
import { TextDecoder, TextEncoder } from "util";
import "@testing-library/jest-dom";

if (typeof global.TextDecoder === "undefined") {
  Object.defineProperty(global, "TextDecoder", {
    value: TextDecoder,
    writable: true,
    configurable: true
  });
}
if (typeof global.TextEncoder === "undefined") {
  Object.defineProperty(global, "TextEncoder", {
    value: TextEncoder,
    writable: true,
    configurable: true
  });
}

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
  default: (props: React.ComponentProps<"img">) => {
    const { onLoadingComplete, ...rest } = props as React.ComponentProps<"img"> & {
      onLoadingComplete?: () => void;
    };
    void onLoadingComplete;
    return React.createElement("img", rest);
  }
}));
