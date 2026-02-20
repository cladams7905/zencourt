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
    'var(--font-italiana, "Italiana"), "Times New Roman", serif',
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
export const OVERLAY_ITALIANA_FONT_FAMILY =
  'var(--font-italiana, "Italiana"), "Times New Roman", serif';
export const OVERLAY_ONEST_FONT_FAMILY =
  'var(--font-onest, "Onest"), "Avenir Next", "Segoe UI", Arial, sans-serif';

export const RICH_OVERLAY_FONT_PAIRINGS = [
  "block-rouge-italiana",
  "block-league-dm",
  "block-rouge-onest",
  "serif-dm-gwendolyn",
  "serif-italiana-rouge"
] as const satisfies readonly OverlayFontPairing[];

export interface FontRoleStyle {
  fontFamily: string;
  fontWeight: number;
}

export const OVERLAY_FONT_PAIRINGS: Record<
  OverlayFontPairing,
  Record<OverlayFontRole, FontRoleStyle>
> = {
  "elegant-script": {
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
  "modern-script": {
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
  "classic-clean": {
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
  "script-forward": {
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
  "block-rouge-italiana": {
    headline: {
      fontFamily: OVERLAY_TIKTOK_FONT_FAMILY,
      fontWeight: 700
    },
    accent: { fontFamily: OVERLAY_ROUGE_FONT_FAMILY, fontWeight: 400 },
    body: {
      fontFamily: OVERLAY_ITALIANA_FONT_FAMILY,
      fontWeight: 700
    }
  },
  "block-league-dm": {
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
  "block-rouge-onest": {
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
  "serif-dm-gwendolyn": {
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
  "serif-italiana-rouge": {
    headline: {
      fontFamily: OVERLAY_ITALIANA_FONT_FAMILY,
      fontWeight: 500
    },
    accent: { fontFamily: OVERLAY_ROUGE_FONT_FAMILY, fontWeight: 400 },
    body: {
      fontFamily: OVERLAY_DM_SERIF_FONT_FAMILY,
      fontWeight: 400
    }
  }
};
