"use client";

import { Archive, ChevronDown, Clock, FileEdit, Heart, Plus } from "lucide-react";
import { Badge } from "../../../../ui/badge";
import { Button } from "../../../../ui/button";
import { cn } from "../../../../ui/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/tooltip";

type SidebarContentSectionProps = {
  expanded: boolean;
  onToggle: () => void;
};

export function SidebarContentSection({
  expanded,
  onToggle
}: SidebarContentSectionProps) {
  return (
    <div className="space-y-1 -mt-1">
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>Content</span>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-foreground/5"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>New Content</TooltipContent>
          </Tooltip>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-0.5 pl-2">
          <Button
            variant="ghost"
            className="w-full justify-between hover:bg-foreground/5"
          >
            <div className="flex items-center gap-3">
              <FileEdit className="h-4 w-4" />
              <span className="text-sm">Drafts</span>
            </div>
            <Badge variant="muted" className="text-xs px-1.5 font-bold py-0 h-5">
              3
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between hover:bg-foreground/5"
          >
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4" />
              <span className="text-sm">Favorites</span>
            </div>
            <Badge variant="muted" className="text-xs px-1.5 font-bold py-0 h-5">
              12
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between hover:bg-foreground/5"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Scheduled</span>
            </div>
            <Badge variant="muted" className="text-xs px-1.5 font-bold py-0 h-5">
              5
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between hover:bg-foreground/5"
          >
            <div className="flex items-center gap-3">
              <Archive className="h-4 w-4" />
              <span className="text-sm">Archive</span>
            </div>
            <Badge variant="muted" className="text-xs px-1.5 font-bold py-0 h-5">
              48
            </Badge>
          </Button>
        </div>
      )}
    </div>
  );
}
