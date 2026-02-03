"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Facebook, Instagram, Plus, FileEdit } from "lucide-react";

type Platform = "facebook" | "instagram";

interface ScheduledPost {
  id: string;
  time: string;
  title: string;
  thumbnail?: string;
  platforms: Platform[];
}

interface ScheduleCardProps {
  date: string;
  dayLabel: string;
  posts: ScheduledPost[];
  className?: string;
  onAddClick?: () => void;
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  if (platform === "facebook") {
    return <Facebook className="h-4 w-4 text-muted-foreground" />;
  }
  return <Instagram className="h-4 w-4 text-muted-foreground" />;
};

const ScheduleCard = ({
  date,
  dayLabel,
  posts,
  className,
  onAddClick
}: ScheduleCardProps) => {
  const visiblePosts = posts.slice(0, 3);
  const remainingCount = posts.length - visiblePosts.length;
  const contentSummary = React.useMemo(() => {
    if (posts.length === 0) return "No content scheduled";

    const videos = posts.filter((p) =>
      p.title.toLowerCase().includes("video")
    ).length;
    const stories = posts.filter((p) =>
      p.title.toLowerCase().includes("story")
    ).length;
    const regular = posts.length - videos - stories;

    const parts = [];
    if (videos > 0) parts.push(`${videos} video${videos > 1 ? "s" : ""}`);
    if (stories > 0)
      parts.push(`${stories} ${stories > 1 ? "stories" : "story"}`);
    if (regular > 0) parts.push(`${regular} post${regular > 1 ? "s" : ""}`);

    return parts.join(", ");
  }, [posts]);

  return (
    <Card className={cn("shrink-0 w-[280px]", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="font-semibold text-lg text-foreground">
              {dayLabel},
            </h3>
            <span className="text-base font-medium text-muted-foreground">
              {date}
            </span>
          </div>
          <div className="flex items-center gap-2 h-5">
            <span
              className={cn(
                "text-xs font-medium",
                posts.length === 0
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground"
              )}
            >
              {contentSummary}
            </span>
          </div>

          {/* Add Button */}
          <Button
            size="icon"
            variant="default"
            onClick={onAddClick}
            className="absolute -top-1 -right-1 h-7 w-7 rounded-full"
          >
            <Plus className="h-4 w-4 text-primary-foreground" />
          </Button>
        </div>

        {/* Posts List */}
        {posts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {visiblePosts.map((post) => (
              <a
                key={post.id}
                href="#"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 transition-colors group"
              >
                {/* Thumbnail */}
                {post.thumbnail ? (
                  <div className="relative h-14 w-14 rounded-lg bg-muted-foreground/5 overflow-hidden shrink-0">
                    <div className="h-full w-full bg-linear-to-br from-secondary/20 to-secondary/5" />
                  </div>
                ) : (
                  <div className="relative h-14 w-14 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                    <FileEdit className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-foreground">
                    {post.time}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {post.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {post.platforms.map((platform, idx) => (
                      <PlatformIcon key={idx} platform={platform} />
                    ))}
                  </div>
                </div>
              </a>
            ))}

            {remainingCount > 0 && (
              <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left px-2">
                +{remainingCount} more
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-muted-foreground/40 text-xs mb-2">
              Tap + to add
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ScheduleCard, type ScheduledPost };
