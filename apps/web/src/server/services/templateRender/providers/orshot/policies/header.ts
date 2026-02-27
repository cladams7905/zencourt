import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  TemplateHeaderLength,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import { getHeaderHooks } from "./hookCatalog";
import { selectRotatedHeaderHook } from "./hookRotation";
import type { TemplateHeaderRotationStore } from "../../../rotation";

const SHORT_HEADERS_BY_SUBCATEGORY: Partial<
  Record<ListingContentSubcategory, readonly string[]>
> = {
  new_listing: ["Just Listed", "New Listing", "For Sale"],
  open_house: ["Open House", "Tour This Home", "This Weekend"],
  price_change: ["Price Reduced", "New Price", "Just Reduced"],
  status_update: ["Just Sold", "Under Contract", "Sold"],
  property_features: ["Home Highlights", "Featured Home", "Property Spotlight"]
};

function splitHeaderText(headerText: string): {
  headerTextTop: string;
  headerTextBottom: string;
} {
  const words = headerText.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return {
      headerTextTop: headerText.trim(),
      headerTextBottom: ""
    };
  }

  const midpoint = Math.ceil(words.length / 2);
  return {
    headerTextTop: words.slice(0, midpoint).join(" "),
    headerTextBottom: words.slice(midpoint).join(" ")
  };
}

function pickShortHeader(params: {
  subcategory: ListingContentSubcategory;
  random?: () => number;
}): string {
  const fallback = ["Featured Listing", "New Home", "Available Now"] as const;
  const options = SHORT_HEADERS_BY_SUBCATEGORY[params.subcategory] ?? fallback;
  const random = params.random ?? Math.random;
  const index = Math.floor(random() * options.length);
  return options[index] ?? options[0] ?? fallback[0];
}

export async function applyHeaderPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  headerLength: TemplateHeaderLength;
  forceUppercaseHeader?: boolean;
  subcategory: ListingContentSubcategory;
  rotationKey?: string;
  rotationStore?: TemplateHeaderRotationStore;
  random?: () => number;
}): Promise<Partial<Record<TemplateRenderParameterKey, string>>> {
  const next = { ...params.resolvedParameters };
  const base = next.headerText?.trim() ?? "";

  let headerText = base;
  if (params.headerLength === "short" || params.headerLength === "medium") {
    const hooks = getHeaderHooks({
      subcategory: params.subcategory,
      headerLength: params.headerLength
    });
    const selectedHook = await selectRotatedHeaderHook({
      hooks,
      rotationKey: params.rotationKey,
      rotationStore: params.rotationStore,
      random: params.random
    });
    if (selectedHook) {
      headerText = selectedHook.header;
      if (selectedHook.subheader) {
        next.subheader1Text = selectedHook.subheader;
      }
    }
    if (!headerText) {
      headerText = pickShortHeader({
        subcategory: params.subcategory,
        random: params.random
      });
    }
  } else if (!base) {
    headerText = pickShortHeader({
      subcategory: params.subcategory,
      random: params.random
    });
  }

  if (params.forceUppercaseHeader) {
    headerText = headerText.toUpperCase().replace(/\.$/, "");
  }

  next.headerText = headerText;
  const split = splitHeaderText(headerText);
  next.headerTextTop = split.headerTextTop;
  next.headerTextBottom = split.headerTextBottom;
  return next;
}
