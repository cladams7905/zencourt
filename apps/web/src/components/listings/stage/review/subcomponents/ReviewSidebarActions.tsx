import { AlertTriangle, SearchCheck } from "lucide-react";

type ReviewSidebarActionsProps = {
  requiredFixes: string[];
};

export const ReviewSidebarActions = ({
  requiredFixes
}: ReviewSidebarActionsProps) => {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary px-4 py-4">
      <div className="flex gap-3 items-center rounded-lg p-2">
        <SearchCheck className="h-8 w-8 text-foreground" />
        <p className="text-xs text-foreground">
          Please review all property details for accuracy before continuing.
        </p>
      </div>
      {requiredFixes.length > 0 ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          <p className="text-[11px] font-semibold uppercase tracking-wide">
            Required fixes
          </p>
          <ul className="mt-2 space-y-2 text-destructive">
            {requiredFixes.map((fix) => (
              <li key={fix} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
