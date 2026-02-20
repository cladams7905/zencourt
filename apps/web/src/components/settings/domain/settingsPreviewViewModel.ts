import type { DBUserAdditional } from "@db/types/models";

const scaleLabels: Record<number, string> = {
  1: "Very informal",
  2: "Informal",
  3: "Conversational",
  4: "Formal",
  5: "Very formal"
};

export const resolveWritingToneLabel = (
  writingTone: DBUserAdditional["writingToneLevel"]
) => scaleLabels[writingTone] ?? "Custom";

export const buildBrandingPreviewModel = (input: {
  userAdditional: DBUserAdditional;
  userName: string;
  location?: string;
}) => {
  const agentName = input.userAdditional.agentName || input.userName;
  const brokerageName = input.userAdditional.brokerageName || "Your Brokerage";
  const agentTitle = input.userAdditional.agentTitle || "";
  const writingStyleNote = input.userAdditional.writingStyleCustom?.trim();
  const headline = input.location
    ? `Just Listed in ${input.location}`
    : "Just Listed: A Fresh New Opportunity";
  const signature = [agentName, agentTitle, brokerageName]
    .filter(Boolean)
    .join(" · ");

  return {
    writingToneLabel: resolveWritingToneLabel(input.userAdditional.writingToneLevel),
    writingStyleNote,
    headline,
    signature
  };
};
