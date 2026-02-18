import { mapSurveyFormDataToSurveySubmission } from "@web/src/components/welcome/domain/submissionMapper";

const mockFormatLocationForStorage = jest.fn();

jest.mock("@web/src/lib/locationHelpers", () => ({
  formatLocationForStorage: (...args: unknown[]) =>
    mockFormatLocationForStorage(...args)
}));

describe("submissionMapper", () => {
  beforeEach(() => {
    mockFormatLocationForStorage.mockReset();
  });

  it("maps survey form data into server submission payload", () => {
    const location = {
      city: "Austin",
      state: "TX",
      country: "US",
      postalCode: "78701",
      county: "Travis",
      serviceAreas: ["Austin", "Round Rock"],
      placeId: "place-1",
      formattedAddress: "Austin, TX 78701"
    };
    mockFormatLocationForStorage.mockReturnValue({
      city: "Austin",
      state: "TX"
    });

    const result = mapSurveyFormDataToSurveySubmission({
      referralSource: "facebook",
      referralSourceOther: undefined,
      location,
      targetAudiences: ["first_time_homebuyers"],
      weeklyPostingFrequency: 4
    });

    expect(mockFormatLocationForStorage).toHaveBeenCalledWith(location);
    expect(result).toEqual({
      referralSource: "facebook",
      referralSourceOther: null,
      location: { city: "Austin", state: "TX" },
      county: "Travis",
      serviceAreas: ["Austin", "Round Rock"],
      targetAudiences: ["first_time_homebuyers"],
      weeklyPostingFrequency: 4
    });
  });

  it("handles nullable optional fields", () => {
    mockFormatLocationForStorage.mockReturnValue({ city: "Austin" });

    const result = mapSurveyFormDataToSurveySubmission({
      referralSource: "other",
      referralSourceOther: "From ad",
      location: {
        city: "Austin",
        state: "TX",
        country: "US",
        placeId: "place-2",
        formattedAddress: "Austin, TX"
      },
      targetAudiences: ["luxury_homebuyers"],
      weeklyPostingFrequency: 2
    });

    expect(result).toEqual({
      referralSource: "other",
      referralSourceOther: "From ad",
      location: { city: "Austin" },
      county: null,
      serviceAreas: null,
      targetAudiences: ["luxury_homebuyers"],
      weeklyPostingFrequency: 2
    });
  });
});
