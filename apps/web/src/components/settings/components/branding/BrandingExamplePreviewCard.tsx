import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
import { Card } from "@web/src/components/ui/card";

interface BrandingExamplePreviewCardProps {
  writingToneLabel: string;
  headline: string;
  writingStyleNote?: string | null;
  signature: string;
}

export const BrandingExamplePreviewCard = ({
  writingToneLabel,
  headline,
  writingStyleNote,
  signature
}: BrandingExamplePreviewCardProps) => {
  return (
    <Card className="bg-secondary border-border shadow-none!">
      <Accordion type="single" className="border-b-0" collapsible>
        <AccordionItem
          value="example"
          className="border-b-0 hover:shadow-none!"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline font-body">
            <div className="flex flex-col text-left gap-1">
              <span className="text-base font-header">Example Post</span>
              <span className="text-xs text-muted-foreground">
                Preview based on your current preferences.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 hover:shadow-none">
            <div className="space-y-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {writingToneLabel} Tone
              </div>
              <div className="font-semibold text-foreground">{headline}</div>
              <p className="text-sm text-muted-foreground">
                Discover a home that balances comfort and style, curated for
                modern living. Reach out for a private walkthrough and
                neighborhood insights.
              </p>
              {writingStyleNote ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {writingStyleNote}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">{signature}</div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};
