import type * as React from "react";

jest.mock("remotion", () => ({
  Composition: "composition-stub",
  registerRoot: jest.fn()
}));

describe("RemotionRoot", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("uses the same vertical composition size as the live preview", async () => {
    const mod = await import("@/services/render/providers/remotion/composition/Root");

    const element = mod.RemotionRoot({}) as React.ReactElement;
    const props = element.props as
      | {
          fps: number;
          width: number;
          height: number;
          calculateMetadata: (args: {
            props: {
              clips: Array<{ durationSeconds: number }>;
              orientation: "vertical" | "landscape";
            };
          }) => {
            durationInFrames: number;
            fps: number;
            width: number;
            height: number;
          };
        }
      | undefined;

    expect(props).toEqual(
      expect.objectContaining({
        fps: 30,
        width: 1080,
        height: 1920
      })
    );

    const calculateMetadata = props?.calculateMetadata as
      | ((args: {
          props: {
            clips: Array<{ durationSeconds: number }>;
            orientation: "vertical" | "landscape";
          };
        }) => {
          durationInFrames: number;
          fps: number;
          width: number;
          height: number;
        })
      | undefined;

    expect(
      calculateMetadata?.({
        props: {
          clips: [{ durationSeconds: 2.5 }],
          orientation: "vertical"
        }
      })
    ).toEqual(
      expect.objectContaining({
        fps: 30,
        width: 1080,
        height: 1920,
        durationInFrames: 75
      })
    );

    expect(
      calculateMetadata?.({
        props: {
          clips: [{ durationSeconds: 2.5 }],
          orientation: "landscape"
        }
      })
    ).toEqual(
      expect.objectContaining({
        width: 1920,
        height: 1080
      })
    );
  });
});
