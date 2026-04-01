import { renderOrshotTemplate } from "../renderPipeline";

const pickPropertyDetails = jest.fn();
const resolveTemplateParameters = jest.fn();
const applyTemplatePolicies = jest.fn();
const buildModifications = jest.fn();
const renderTemplate = jest.fn();

jest.mock("../parameters", () => ({
  pickPropertyDetails: (...args: unknown[]) => pickPropertyDetails(...args),
  resolveTemplateParameters: (...args: unknown[]) =>
    resolveTemplateParameters(...args)
}));

jest.mock("../policies", () => ({
  applyTemplatePolicies: (...args: unknown[]) => applyTemplatePolicies(...args)
}));

jest.mock("../modifications", () => ({
  buildModifications: (...args: unknown[]) => buildModifications(...args)
}));

jest.mock("../client", () => ({
  renderTemplate: (...args: unknown[]) => renderTemplate(...args)
}));

describe("orshot render pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs parameter resolution, policies, modifications, and rendering in order", async () => {
    const details = { beds: 3 };
    const resolvedParameters = { header: "hello" };
    const normalizedParameters = { header: "HELLO" };
    const modifications = { text: "HELLO" };

    pickPropertyDetails.mockReturnValue(details);
    resolveTemplateParameters.mockReturnValue(resolvedParameters);
    applyTemplatePolicies.mockResolvedValue(normalizedParameters);
    buildModifications.mockReturnValue(modifications);
    renderTemplate.mockResolvedValue("https://img.test/rendered.jpg");

    const template = {
      id: "template-1",
      headerLength: "short",
      forceUppercaseHeader: true,
      forceListingAddressSubheader: false
    };
    const listing = { id: "listing-1" };
    const listingImages = [{ id: "img-1" }];
    const userAdditional = { displayName: "Agent" };
    const captionItem = { header: "hello" };
    const random = () => 0.123;
    const now = new Date("2026-04-01T12:00:00.000Z");
    const headerRotationStore = { headers: new Map() };
    const imageRotationStore = { images: new Map() };

    const result = await renderOrshotTemplate({
      template: template as never,
      subcategory: "new_listing",
      listing: listing as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem: captionItem as never,
      random,
      now,
      renderIndex: 2,
      headerRotationStore: headerRotationStore as never,
      imageRotationStore: imageRotationStore as never
    });

    expect(pickPropertyDetails).toHaveBeenCalledWith(listing);
    expect(resolveTemplateParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        subcategory: "new_listing",
        listing,
        listingImages,
        userAdditional,
        captionItem,
        random,
        now,
        renderIndex: 2,
        rotationKey: "listing-1:template-1",
        imageRotationStore
      })
    );
    expect(applyTemplatePolicies).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedParameters,
        headerLength: "short",
        forceUppercaseHeader: true,
        forceListingAddressSubheader: false,
        headerRotationStore,
        subcategory: "new_listing",
        details,
        contactSource: userAdditional,
        rotationKey: "listing-1:template-1:new_listing:short",
        random
      })
    );
    expect(buildModifications).toHaveBeenCalledWith({
      resolvedParameters: normalizedParameters,
      template
    });
    expect(renderTemplate).toHaveBeenCalledWith({
      templateId: "template-1",
      modifications
    });
    expect(result).toEqual({
      imageUrl: "https://img.test/rendered.jpg",
      parametersUsed: normalizedParameters,
      modifications
    });
  });

  it("uses a medium header length fallback in the policy rotation key", async () => {
    pickPropertyDetails.mockReturnValue({});
    resolveTemplateParameters.mockReturnValue({});
    applyTemplatePolicies.mockResolvedValue({});
    buildModifications.mockReturnValue({});
    renderTemplate.mockResolvedValue("https://img.test/rendered.jpg");

    await renderOrshotTemplate({
      template: { id: "template-2" } as never,
      subcategory: "open_house",
      listing: { id: "listing-9" } as never,
      listingImages: [] as never,
      userAdditional: {} as never,
      captionItem: {} as never,
      renderIndex: 0
    });

    expect(applyTemplatePolicies).toHaveBeenCalledWith(
      expect.objectContaining({
        rotationKey: "listing-9:template-2:open_house:medium"
      })
    );
  });
});
