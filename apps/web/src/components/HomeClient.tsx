"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ProjectsView } from "./ProjectsView";
import { VideoEditor } from "./VideoEditor";
import { SocialMediaView } from "./SocialMediaView";
import { SettingsView } from "./SettingsView";
import type { Project } from "../types/schema";

interface HomeClientProps {
  initialProjects: Project[];
}

export function HomeClient({ initialProjects }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="size-full flex bg-gradient-to-br from-[#e8ddd3] via-white to-[#d4c4b0] relative">
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px"
        }}
      />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-auto relative z-10 pt-16 lg:pt-0 lg:pb-0">
        {activeTab === "projects" && (
          <ProjectsView initialProjects={initialProjects} />
        )}
        {activeTab === "editor" && <VideoEditor />}
        {activeTab === "social" && <SocialMediaView />}
        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
