/** @jest-environment node */

const mockWhere = jest.fn();
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@db/client", () => ({
  db: { select: () => mockSelect() },
  eq: jest.fn(() => "eq-clause"),
  userAdditional: {
    userId: "userId",
    targetAudiences: "targetAudiences",
    location: "location",
    writingToneLevel: "writingToneLevel",
    writingStyleCustom: "writingStyleCustom",
    agentName: "agentName",
    brokerageName: "brokerageName",
    agentBio: "agentBio",
    audienceDescription: "audienceDescription",
    county: "county",
    serviceAreas: "serviceAreas"
  }
}));

import { getUserAdditionalSnapshot } from "../userAdditional";

describe("content/generate services/userAdditional", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps db row to snapshot payload", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        targetAudiences: ["buyers"],
        location: "Austin, TX",
        writingToneLevel: 4,
        writingStyleCustom: "No fluff",
        agentName: "Agent",
        brokerageName: "Broker",
        agentBio: "Bio",
        audienceDescription: "Audience",
        county: "Travis",
        serviceAreas: ["Austin"]
      }
    ]);

    await expect(getUserAdditionalSnapshot("user-1")).resolves.toEqual({
      targetAudiences: ["buyers"],
      location: "Austin, TX",
      writingToneLevel: 4,
      writingStyleCustom: "No fluff",
      agentName: "Agent",
      brokerageName: "Broker",
      agentBio: "Bio",
      audienceDescription: "Audience",
      county: "Travis",
      serviceAreas: ["Austin"]
    });
  });

  it("returns safe defaults when user row is missing", async () => {
    mockWhere.mockResolvedValueOnce([]);

    await expect(getUserAdditionalSnapshot("user-1")).resolves.toEqual({
      targetAudiences: null,
      location: null,
      writingToneLevel: null,
      writingStyleCustom: null,
      agentName: "",
      brokerageName: "",
      agentBio: null,
      audienceDescription: null,
      county: null,
      serviceAreas: null
    });
  });
});
