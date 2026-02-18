const mockGetSignedUploadUrl = jest.fn();

const mockNanoid = jest.fn(() => "media-contract-id");

jest.mock("nanoid", () => ({ nanoid: () => mockNanoid() }));
const mockBuildPublicUrlForKey = jest.fn((key: string) => `https://cdn.example/${key}`);
const mockWithDbErrorHandling = jest.fn(async (fn: () => Promise<unknown>) => await fn());

jest.mock("@db/client", () => ({
  db: { insert: jest.fn() },
  userMedia: {},
  userAdditional: { userId: "userId" }
}));

jest.mock("@web/src/server/services/storageService", () => ({
  __esModule: true,
  default: {
    getSignedUploadUrl: (...args: unknown[]) => mockGetSignedUploadUrl(...args),
    buildPublicUrlForKey: (...args: unknown[]) => mockBuildPublicUrlForKey(...args)
  }
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => mockWithDbErrorHandling(...args)
}));

import { getUserMediaUploadUrls } from "@web/src/server/actions/db/userMedia/uploads";

describe("userMedia uploads storage path contract", () => {
  beforeEach(() => {
    mockGetSignedUploadUrl.mockReset();
    mockBuildPublicUrlForKey.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("generates expected shared storage paths for image and video uploads", async () => {
    mockGetSignedUploadUrl
      .mockResolvedValueOnce({ success: true, url: "https://signed-image" })
      .mockResolvedValueOnce({ success: true, url: "https://signed-video" })
      .mockResolvedValueOnce({ success: true, url: "https://signed-thumb" });

    const result = await getUserMediaUploadUrls("u42", [
      { id: "i1", fileName: "front.jpg", fileType: "image/jpeg", fileSize: 100 },
      { id: "v1", fileName: "walkthrough.mp4", fileType: "video/mp4", fileSize: 100 }
    ]);

    expect(result.uploads).toEqual([
      expect.objectContaining({
        key: expect.stringMatching(/^user_u42\/media\/images\/front-.*\.jpg$/)
      }),
      expect.objectContaining({
        key: expect.stringMatching(
          /^user_u42\/media\/videos\/walkthrough-.*\.mp4$/
        ),
        thumbnailKey: expect.stringMatching(
          /^user_u42\/media\/thumbnails\/walkthrough-thumb-.*\.jpg$/
        )
      })
    ]);
  });
});
