import {
  Play,
  Pause,
  Volume2,
  Maximize,
  Scissors,
  Type,
  Music,
  Video,
  LayoutGrid,
  Subtitles,
  Plus
} from "lucide-react";
import { useState } from "react";
import { Switch } from "./ui/switch";
import Image from "next/image";

export function VideoEditor() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"vertical" | "landscape">(
    "vertical"
  );
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  const scenes = [
    {
      id: 1,
      name: "Exterior",
      duration: 5,
      thumbnail:
        "https://images.unsplash.com/photo-1560170412-0f7df0eb0fb1?w=200&q=80"
    },
    {
      id: 2,
      name: "Living Room",
      duration: 5,
      thumbnail:
        "https://images.unsplash.com/photo-1671966550483-bed07f4c93b4?w=200&q=80"
    },
    {
      id: 3,
      name: "Kitchen",
      duration: 5,
      thumbnail:
        "https://images.unsplash.com/photo-1546552229-7b16095d6904?w=200&q=80"
    },
    {
      id: 4,
      name: "Bedroom",
      duration: 5,
      thumbnail:
        "https://images.unsplash.com/photo-1632060503164-790178d036b8?w=200&q=80"
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-2">Video Editor</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Edit and customize your AI-generated walkthrough
          </p>
        </div>

        {/* Aspect Ratio Toggle */}
        <div className="flex gap-1 sm:gap-2 bg-white rounded-lg p-1 border border-border w-full sm:w-auto">
          <button
            onClick={() => setAspectRatio("vertical")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
              aspectRatio === "vertical"
                ? "bg-black text-white"
                : "hover:bg-secondary"
            }`}
          >
            <Video size={16} />
            9:16
          </button>
          <button
            onClick={() => setAspectRatio("landscape")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
              aspectRatio === "landscape"
                ? "bg-black text-white"
                : "hover:bg-secondary"
            }`}
          >
            <LayoutGrid size={16} />
            16:9
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col min-w-0 order-2 lg:order-1">
          {/* Video Preview */}
          <div className="flex justify-center mb-4">
            <div
              className={`bg-gradient-to-br from-[#d4c4b0] to-[#e8ddd3] rounded-xl relative overflow-hidden ${
                aspectRatio === "vertical"
                  ? "aspect-[9/16] max-h-[400px] sm:max-h-[500px] lg:h-[600px]"
                  : "aspect-video w-full"
              }`}
            >
              <Image
                src="https://images.unsplash.com/photo-1671966550483-bed07f4c93b4?w=1200&q=80"
                alt="Video preview"
                className="w-full h-full object-cover"
              />

              {/* Subtitle Preview */}
              {subtitlesEnabled && (
                <div className="absolute bottom-20 left-4 right-4 flex justify-center">
                  <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-center max-w-md">
                    Welcome to this beautiful family home
                  </div>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause size={32} fill="black" stroke="black" />
                  ) : (
                    <Play size={32} fill="black" stroke="black" />
                  )}
                </button>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 text-white">
                <div className="flex items-center gap-2">
                  <Volume2 size={20} />
                  <div className="w-24 h-1 bg-white/30 rounded-full">
                    <div className="w-16 h-full bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="ml-auto">
                  <Maximize size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-border p-3 sm:p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg">Timeline</h3>
              <div className="flex gap-1 sm:gap-2">
                <button
                  className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Split clip"
                >
                  <Scissors size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                  className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Add text"
                >
                  <Type size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                  className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Add subtitles"
                >
                  <Subtitles size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                  className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors hidden sm:block"
                  title="Add music"
                >
                  <Music size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* Video Track */}
              <div className="flex gap-1">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="relative h-20 rounded-lg overflow-hidden border border-border group cursor-pointer"
                    style={{ width: `${scene.duration * 12}px` }}
                  >
                    <Image
                      src={scene.thumbnail}
                      alt={scene.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs">{scene.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtitle Track */}
              {subtitlesEnabled && (
                <div className="h-10 bg-gradient-to-r from-purple-100 to-purple-50 rounded-lg flex items-center px-2 gap-1 overflow-hidden">
                  <div
                    className="bg-purple-500/30 h-6 rounded px-2 flex items-center text-xs whitespace-nowrap"
                    style={{ width: "96px" }}
                  >
                    Welcome to
                  </div>
                  <div
                    className="bg-purple-500/30 h-6 rounded px-2 flex items-center text-xs whitespace-nowrap"
                    style={{ width: "144px" }}
                  >
                    this stunning loft
                  </div>
                </div>
              )}

              {/* Audio Track */}
              <div className="h-12 bg-gradient-to-r from-black/5 to-black/10 rounded-lg flex items-center px-2">
                <div className="flex gap-0.5 h-6 items-end w-full">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-black/40 rounded-sm"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Playhead */}
            <div className="relative mt-2">
              <div className="h-1 bg-secondary rounded-full">
                <div className="h-full w-1/3 bg-black rounded-full relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0:00</span>
                <span>0:38</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Tools */}
        <div className="w-full lg:w-72 bg-white rounded-xl border border-border p-4 flex-shrink-0 overflow-y-auto order-1 lg:order-2">
          <h3 className="mb-4">Properties</h3>

          <div className="space-y-4">
            {/* Subtitles Section */}
            <div className="pb-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2">
                  <Subtitles size={16} />
                  Subtitles
                </label>
                <Switch
                  checked={subtitlesEnabled}
                  onCheckedChange={setSubtitlesEnabled}
                />
              </div>

              {subtitlesEnabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <label className="block text-sm mb-2">Language</label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm">
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>Mandarin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Style</label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm">
                      <option>Modern</option>
                      <option>Classic</option>
                      <option>Bold</option>
                      <option>Minimal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Position</label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm">
                      <option>Bottom</option>
                      <option>Top</option>
                      <option>Center</option>
                    </select>
                  </div>

                  <button className="w-full px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Edit Captions
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-2">Platform Preset</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-white">
                <option>TikTok</option>
                <option>Instagram Reels</option>
                <option>YouTube Shorts</option>
                <option>YouTube</option>
                <option>Facebook</option>
                <option>Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Transition Style</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-white">
                <option>Smooth Fade</option>
                <option>Cross Dissolve</option>
                <option>Slide</option>
                <option>Zoom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Music</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-white">
                <option>Ambient Calm</option>
                <option>Modern Upbeat</option>
                <option>Classical</option>
                <option>Trending Sound</option>
                <option>None</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Voice Over</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-white">
                <option>Professional Female</option>
                <option>Professional Male</option>
                <option>Casual</option>
                <option>Energetic</option>
                <option>None</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Speed</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                defaultValue="1"
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center mt-1">
                1.0x
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <button className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors">
                Export Video
              </button>
              <button className="w-full px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
