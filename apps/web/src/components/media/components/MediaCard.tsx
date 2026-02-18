import { Film, Image as ImageIcon, X } from "lucide-react";
import { Badge } from "@web/src/components/ui/badge";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { LoadingVideo } from "@web/src/components/ui/loading-video";
import type { DBUserMedia } from "@shared/types/models";
import { formatUploadDate } from "@web/src/components/media/domain";

interface MediaCardProps {
  item: DBUserMedia;
  onDelete: (item: DBUserMedia) => void;
}

export const MediaCard = ({ item, onDelete }: MediaCardProps) => {
  const TypeIcon = item.type === "video" ? Film : ImageIcon;
  const aspectRatio = item.type === "video" ? "9 / 16" : "4 / 3";

  return (
    <div className="group break-inside-avoid mb-6 border border-border rounded-lg bg-card shadow-sm">
      <div className="relative overflow-hidden rounded-lg">
        <div className="relative w-full" style={{ aspectRatio }}>
          {item.type === "video" ? (
            <LoadingVideo
              videoSrc={item.url}
              thumbnailSrc={item.thumbnailUrl ?? undefined}
              thumbnailAlt="Video preview"
              className="h-full w-full"
              imageClassName="object-cover"
              videoClassName="object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <LoadingImage
              src={item.url}
              alt="Uploaded media"
              fill
              sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 1024px) 32vw, (min-width: 768px) 48vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-black/20 text-white backdrop-blur-sm">
            <TypeIcon className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">{item.type}</span>
          </Badge>
        </div>

        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/70 backdrop-blur-sm hover:bg-background rounded-full"
            aria-label="Delete media"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(item);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 pointer-events-none">
          <span>{`Uploaded ${formatUploadDate(item.uploadedAt)}`}</span>
          <span>{`Used ${item.usageCount}x`}</span>
        </div>
      </div>
    </div>
  );
};
