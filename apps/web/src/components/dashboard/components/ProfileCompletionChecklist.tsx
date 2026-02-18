"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "../../ui/utils";
import { Card, CardContent } from "../../ui/card";

interface ProfileCompletionChecklistProps {
  profileCompleted: boolean;
  writingStyleCompleted: boolean;
  mediaUploaded: boolean;
  className?: string;
}

const checklistItems = [
  {
    id: "profile",
    title: "Complete your profile",
    description: "Add your name and brokerage",
    anchor: "#profile"
  },
  {
    id: "writing-style",
    title: "Define your writing style",
    description: "Help AI sound like you",
    anchor: "#writing-style"
  },
  {
    id: "media",
    title: "Upload media",
    description: "Add b-roll images and videos",
    anchor: "#media"
  }
];

export function ProfileCompletionChecklist({
  profileCompleted,
  writingStyleCompleted,
  mediaUploaded,
  className
}: ProfileCompletionChecklistProps) {
  const router = useRouter();

  // Return null if all items are completed
  if (profileCompleted && writingStyleCompleted && mediaUploaded) {
    return null;
  }

  const completionStatus = {
    profile: profileCompleted,
    "writing-style": writingStyleCompleted,
    media: mediaUploaded
  };

  const completedCount = [
    profileCompleted,
    writingStyleCompleted,
    mediaUploaded
  ].filter(Boolean).length;
  const totalCount = 3;

  const handleItemClick = (anchor: string) => {
    router.push(`/settings${anchor}`);
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all duration-300 max-w-3xl",
        className
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl text-foreground">Complete Your Profile</h2>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>
                {completedCount} of {totalCount}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Get the most out of Zencourt by completing setup
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const isCompleted =
              completionStatus[item.id as keyof typeof completionStatus];

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.anchor)}
                className={cn(
                  "group w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                  "hover:bg-secondary",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isCompleted && "opacity-60"
                )}
              >
                {/* Checkbox icon */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-foreground" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium text-foreground",
                      isCompleted && "line-through"
                    )}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="shrink-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
