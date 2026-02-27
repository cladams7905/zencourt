import type { HeaderHook } from "./hookCatalog";
import type { TemplateHeaderRotationStore } from "../../../rotation";

const HOOK_ROTATION_PREFIX = "template:header-hook-rotation";

function normalizeRotationKey(rotationKey?: string): string {
  return rotationKey?.trim() || "default";
}

export async function selectRotatedHeaderHook(params: {
  hooks: HeaderHook[];
  rotationKey?: string;
  rotationStore?: TemplateHeaderRotationStore;
  random?: () => number;
}): Promise<HeaderHook | null> {
  const hooks = params.hooks;
  if (hooks.length === 0) {
    return null;
  }
  if (hooks.length === 1) {
    return hooks[0] as HeaderHook;
  }

  const random = params.random ?? Math.random;
  if (!params.rotationKey) {
    return hooks[Math.floor(random() * hooks.length)] as HeaderHook;
  }

  if (!params.rotationStore) {
    return hooks[Math.floor(random() * hooks.length)] as HeaderHook;
  }

  const key = `${HOOK_ROTATION_PREFIX}:${normalizeRotationKey(params.rotationKey)}`;
  try {
    const previous = await params.rotationStore.getIndex(key);
    const nextIndex =
      typeof previous === "number" ? (previous + 1) % hooks.length : 0;
    await params.rotationStore.setIndex(key, nextIndex);
    return hooks[nextIndex] as HeaderHook;
  } catch {
    return hooks[Math.floor(random() * hooks.length)] as HeaderHook;
  }
}
