import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";

const DEFAULT_GARAGE_LABEL = "Car Garage";

export function applyGarageLabelPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const garageCountRaw = params.resolvedParameters.garageCount?.trim() ?? "";
  const garageCount = Number(garageCountRaw);
  const hasGarage =
    Number.isFinite(garageCount) && garageCount > 0;

  return {
    ...params.resolvedParameters,
    garageLabel: hasGarage ? DEFAULT_GARAGE_LABEL : ""
  };
}
