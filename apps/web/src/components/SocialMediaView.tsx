import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Check,
  Video
} from "lucide-react";
import { useState } from "react";

// TikTok icon component
const TikTokIcon = ({
  size = 24,
  color = "currentColor"
}: {
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
      fill={color}
    />
  </svg>
);

export function SocialMediaView() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platforms = [
    {
      id: "tiktok",
      name: "TikTok",
      icon: TikTokIcon,
      color: "#000000",
      connected: true,
      format: "vertical"
    },
    {
      id: "instagram",
      name: "Instagram Reels",
      icon: Instagram,
      color: "#E4405F",
      connected: true,
      format: "vertical"
    },
    {
      id: "youtube-shorts",
      name: "YouTube Shorts",
      icon: Youtube,
      color: "#FF0000",
      connected: true,
      format: "vertical"
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      color: "#FF0000",
      connected: true,
      format: "landscape"
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      connected: false,
      format: "both"
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      icon: Twitter,
      color: "#000000",
      connected: false,
      format: "both"
    }
  ];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl mb-2">Social Media</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Share your videos across TikTok, YouTube Shorts, Instagram Reels, and
          more
        </p>
      </div>

      {/* Connected Platforms */}
      <div className="mb-6 sm:mb-8">
        <h3 className="mb-4 text-lg sm:text-xl">Connected Platforms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.id}
                className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${platform.color}15` }}
                  >
                    <Icon size={24} color={platform.color} />
                  </div>
                  {platform.connected && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Check size={16} />
                      Connected
                    </div>
                  )}
                </div>
                <h4 className="mb-2">{platform.name}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs px-2 py-1 bg-secondary rounded-full">
                    {platform.format === "vertical" && "9:16"}
                    {platform.format === "landscape" && "16:9"}
                    {platform.format === "both" && "9:16 / 16:9"}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {platform.connected
                    ? "Ready to publish"
                    : "Connect to start sharing"}
                </p>
                {platform.connected ? (
                  <button className="w-full px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                    Manage
                  </button>
                ) : (
                  <button className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors">
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Publish Section */}
      <div className="bg-linear-to-br from-[#d4c4b0] to-[#e8ddd3] rounded-xl p-4 sm:p-6 lg:p-8">
        <h3 className="mb-4 sm:mb-6 text-lg sm:text-xl">Publish Video</h3>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Video Selection */}
          <div>
            <label className="block text-sm mb-3">Select Video</label>
            <select className="w-full px-4 py-3 border border-border rounded-lg bg-white mb-4">
              <option>Cozy Family Home - 0:45 (9:16)</option>
              <option>Suburban Ranch House - 1:20 (9:16)</option>
              <option>3BR Home with Backyard - 0:58 (9:16)</option>
              <option>Move-In Ready Home - 2:30 (16:9)</option>
            </select>

            <label className="block text-sm mb-3">Select Platforms</label>
            <div className="space-y-2 mb-4">
              {platforms
                .filter((p) => p.connected)
                .map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : "bg-white border-border hover:border-black"
                      }`}
                    >
                      <Icon
                        size={20}
                        color={isSelected ? "white" : platform.color}
                      />
                      <span>{platform.name}</span>
                      <span className="text-xs opacity-70 ml-auto mr-2">
                        {platform.format === "vertical" && "9:16"}
                        {platform.format === "landscape" && "16:9"}
                        {platform.format === "both" && "9:16/16:9"}
                      </span>
                      {isSelected && <Check size={18} />}
                    </button>
                  );
                })}
            </div>

            {/* Auto-optimization notice */}
            {selectedPlatforms.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-900">
                  ✨ Video will be automatically optimized for each platform
                </p>
              </div>
            )}
          </div>

          {/* Post Details */}
          <div>
            <label className="block text-sm mb-3">Caption</label>
            <textarea
              placeholder="Write a compelling description for your video...&#10;&#10;💡 Tip: Use platform-specific hashtags for better reach!"
              className="w-full px-4 py-3 border border-border rounded-lg bg-white mb-4 resize-none"
              rows={4}
            />

            <label className="block text-sm mb-3">Hashtags</label>
            <input
              type="text"
              placeholder="#realestate #hometour #luxury #property"
              className="w-full px-4 py-3 border border-border rounded-lg bg-white mb-4"
            />

            <label className="block text-sm mb-3">Schedule (Optional)</label>
            <div className="flex gap-3 mb-6">
              <input
                type="date"
                className="flex-1 px-4 py-3 border border-border rounded-lg bg-white"
              />
              <input
                type="time"
                className="flex-1 px-4 py-3 border border-border rounded-lg bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 px-4 py-3 border border-black rounded-lg hover:bg-black/5 transition-colors">
                Schedule
              </button>
              <button
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedPlatforms.length === 0}
              >
                Post Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="mt-6 sm:mt-8">
        <h3 className="mb-4 text-lg sm:text-xl">Recent Posts</h3>
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {[
              {
                video: "Cozy Family Home",
                platform: "TikTok",
                format: "9:16",
                status: "Published",
                time: "2 hours ago",
                views: "12.5K"
              },
              {
                video: "3BR Home with Backyard",
                platform: "Instagram Reels",
                format: "9:16",
                status: "Published",
                time: "1 day ago",
                views: "8.2K"
              },
              {
                video: "Suburban Ranch House",
                platform: "YouTube Shorts",
                format: "9:16",
                status: "Published",
                time: "2 days ago",
                views: "15.8K"
              },
              {
                video: "Move-In Ready Home",
                platform: "YouTube",
                format: "16:9",
                status: "Scheduled",
                time: "Tomorrow, 10:00 AM",
                views: "-"
              }
            ].map((post, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-secondary/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-secondary rounded-lg flex-linear-0">
                    <Video size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 text-sm sm:text-base truncate">
                      {post.video}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {post.platform}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                        {post.format}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-linear-0">
                  <div className="text-sm mb-1 flex flex-wrap sm:justify-end items-center gap-2 sm:gap-3">
                    {post.views !== "-" && (
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        {post.views} views
                      </span>
                    )}
                    <span
                      className={`text-xs sm:text-sm ${
                        post.status === "Published"
                          ? "text-green-600"
                          : "text-blue-600"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {post.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
