import type {
  DBListing,
  DBListingImage,
  DBUserAdditional
} from "@db/types/models";
import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  TemplateRenderCaptionItemInput,
  TemplateRenderConfig,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import type {
  TemplateHeaderRotationStore,
  TemplateImageRotationStore
} from "@web/src/server/services/templateRender/rotation";
import { applyTemplatePolicies } from "./policies";
import { pickPropertyDetails, resolveTemplateParameters } from "./parameters";
import { buildModifications } from "./modifications";
import { renderTemplate } from "./client";

export type RenderOrshotTemplateParams = {
  template: TemplateRenderConfig;
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItem: TemplateRenderCaptionItemInput;
  siteOrigin?: string | null;
  random?: () => number;
  now?: Date;
  renderIndex: number;
  headerRotationStore?: TemplateHeaderRotationStore;
  imageRotationStore?: TemplateImageRotationStore;
};

export type RenderOrshotTemplateResult = {
  imageUrl: string;
  parametersUsed: Partial<Record<TemplateRenderParameterKey, string>>;
  modifications: Record<string, string>;
};

/**
 * Orshot render pipeline: resolve parameters → apply policies → build modifications → render.
 * Encapsulates all orshot-specific logic including policies.
 */
export async function renderOrshotTemplate(
  params: RenderOrshotTemplateParams
): Promise<RenderOrshotTemplateResult> {
  const details = pickPropertyDetails(params.listing);

  const resolvedParameters = resolveTemplateParameters({
    subcategory: params.subcategory,
    listing: params.listing,
    listingImages: params.listingImages,
    userAdditional: params.userAdditional,
    captionItem: params.captionItem,
    siteOrigin: params.siteOrigin,
    random: params.random,
    now: params.now,
    renderIndex: params.renderIndex,
    rotationKey: `${params.listing.id}:${params.template.id}`,
    imageRotationStore: params.imageRotationStore
  });

  const normalizedParameters = await applyTemplatePolicies({
    resolvedParameters,
    headerLength: params.template.headerLength,
    forceUppercaseHeader: params.template.forceUppercaseHeader,
    forceListingAddressSubheader: params.template.forceListingAddressSubheader,
    headerRotationStore: params.headerRotationStore,
    subcategory: params.subcategory,
    details,
    contactSource: params.userAdditional as unknown as Record<string, unknown>,
    rotationKey: `${params.listing.id}:${params.template.id}:${params.subcategory}:${params.template.headerLength ?? "medium"}`,
    random: params.random
  });

  const modifications = buildModifications({
    resolvedParameters: normalizedParameters,
    template: params.template
  });

  const imageUrl = await renderTemplate({
    templateId: params.template.id,
    modifications
  });

  return {
    imageUrl,
    parametersUsed: normalizedParameters,
    modifications
  };
}
