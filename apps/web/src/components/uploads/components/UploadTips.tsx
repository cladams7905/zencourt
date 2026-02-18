"use client";

interface UploadTipsProps {
  tipsTitle?: string;
  tipsItems?: string[];
}

export function UploadTips({ tipsTitle, tipsItems }: UploadTipsProps) {
  if (!tipsItems || tipsItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-secondary px-4 py-3">
      <p className="text-sm font-medium text-foreground">{tipsTitle ?? "Tips"}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {tipsItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
