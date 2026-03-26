import type {
  OverlayFontPairing,
  OverlayFontRole,
  PreviewTextOverlay
} from "../../../types/video";

export const PREVIEW_TEXT_OVERLAY_FONT_FAMILY: Record<
  PreviewTextOverlay["font"],
  string
> = {
  "serif-elegant":
    'var(--font-noto-serif-display, "Noto Serif Display"), "Times New Roman", serif',
  "serif-classic": 'Georgia, "Times New Roman", serif',
  "sans-modern":
    'var(--font-body, "Mulish"), "Avenir Next", "Segoe UI", Arial, sans-serif'
};

export const OVERLAY_SCRIPT_FONT_FAMILY =
  'var(--font-rouge, "Rouge Script"), cursive';
export const OVERLAY_ROUGE_FONT_FAMILY =
  'var(--font-rouge, "Rouge Script"), cursive';
export const OVERLAY_GWENDOLYN_FONT_FAMILY =
  'var(--font-gwendolyn, "Gwendolyn"), cursive';
export const OVERLAY_TIKTOK_FONT_FAMILY =
  'var(--font-tiktok, "TikTok Sans"), "Arial Black", "Helvetica Neue", sans-serif';
export const OVERLAY_DM_SERIF_FONT_FAMILY =
  'var(--font-dm-serif, "DM Serif Text"), "Times New Roman", serif';
export const OVERLAY_DISPLAY_SERIF_FONT_FAMILY =
  'var(--font-noto-serif-display, "Noto Serif Display"), "Times New Roman", serif';
export const OVERLAY_ONEST_FONT_FAMILY =
  'var(--font-onest, "Onest"), "Avenir Next", "Segoe UI", Arial, sans-serif';

export const RICH_OVERLAY_FONT_PAIRINGS = [
  "stacked-accent",
  "stacked-serif",
  "stacked-modern",
  "refined-serif",
  "heritage-serif"
] as const satisfies readonly OverlayFontPairing[];

export interface FontRoleStyle {
  fontFamily: string;
  fontWeight: number;
}

export const OVERLAY_FONT_PAIRINGS: Record<
  OverlayFontPairing,
  Record<OverlayFontRole, FontRoleStyle>
> = {
  "editorial-script": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 600
    },
    accent: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 400
    }
  },
  "contemporary-script": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 700
    },
    accent: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    }
  },
  "editorial-clean": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-classic"],
      fontWeight: 700
    },
    accent: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 400
    },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-classic"],
      fontWeight: 400
    }
  },
  "statement-script": {
    headline: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    accent: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    }
  },
  "stacked-accent": {
    headline: {
      fontFamily: OVERLAY_TIKTOK_FONT_FAMILY,
      fontWeight: 700
    },
    accent: { fontFamily: OVERLAY_ROUGE_FONT_FAMILY, fontWeight: 400 },
    body: {
      fontFamily: OVERLAY_DISPLAY_SERIF_FONT_FAMILY,
      fontWeight: 700
    }
  },
  "stacked-serif": {
    headline: {
      fontFamily: OVERLAY_TIKTOK_FONT_FAMILY,
      fontWeight: 700
    },
    accent: { fontFamily: OVERLAY_GWENDOLYN_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: OVERLAY_DM_SERIF_FONT_FAMILY,
      fontWeight: 400
    }
  },
  "stacked-modern": {
    headline: {
      fontFamily: OVERLAY_TIKTOK_FONT_FAMILY,
      fontWeight: 600
    },
    accent: { fontFamily: OVERLAY_ROUGE_FONT_FAMILY, fontWeight: 400 },
    body: {
      fontFamily: OVERLAY_ONEST_FONT_FAMILY,
      fontWeight: 500
    }
  },
  "refined-serif": {
    headline: {
      fontFamily: OVERLAY_DM_SERIF_FONT_FAMILY,
      fontWeight: 400
    },
    accent: { fontFamily: OVERLAY_GWENDOLYN_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: OVERLAY_ONEST_FONT_FAMILY,
      fontWeight: 500
    }
  },
  "heritage-serif": {
    headline: {
      fontFamily: OVERLAY_DISPLAY_SERIF_FONT_FAMILY,
      fontWeight: 500
    },
    accent: { fontFamily: OVERLAY_ROUGE_FONT_FAMILY, fontWeight: 400 },
    body: {
      fontFamily: OVERLAY_DM_SERIF_FONT_FAMILY,
      fontWeight: 400
    }
  }
};
