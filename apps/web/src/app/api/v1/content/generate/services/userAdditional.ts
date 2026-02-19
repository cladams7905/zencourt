import { db, eq, userAdditional } from "@db/client";

export type UserAdditionalSnapshot = {
  targetAudiences: string[] | null;
  location: string | null;
  writingToneLevel: number | null;
  writingStyleCustom: string | null;
  agentName: string;
  brokerageName: string;
  agentBio: string | null;
  audienceDescription: string | null;
  county: string | null;
  serviceAreas: string[] | null;
};

export async function getUserAdditionalSnapshot(
  userId: string
): Promise<UserAdditionalSnapshot> {
  const [record] = await db
    .select({
      targetAudiences: userAdditional.targetAudiences,
      location: userAdditional.location,
      writingToneLevel: userAdditional.writingToneLevel,
      writingStyleCustom: userAdditional.writingStyleCustom,
      agentName: userAdditional.agentName,
      brokerageName: userAdditional.brokerageName,
      agentBio: userAdditional.agentBio,
      audienceDescription: userAdditional.audienceDescription,
      county: userAdditional.county,
      serviceAreas: userAdditional.serviceAreas
    })
    .from(userAdditional)
    .where(eq(userAdditional.userId, userId));

  return {
    targetAudiences: record?.targetAudiences ?? null,
    location: record?.location ?? null,
    writingToneLevel: record?.writingToneLevel ?? null,
    writingStyleCustom: record?.writingStyleCustom ?? null,
    agentName: record?.agentName ?? "",
    brokerageName: record?.brokerageName ?? "",
    agentBio: record?.agentBio ?? null,
    audienceDescription: record?.audienceDescription ?? null,
    county: record?.county ?? null,
    serviceAreas: record?.serviceAreas ?? null
  };
}
