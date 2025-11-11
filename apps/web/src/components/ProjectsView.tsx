import {
  Play,
  MoreVertical,
  Plus,
  Video,
  LayoutGrid,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "./EmptyState";
import { ProjectWorkflowModal } from "./modals/ProjectWorkflowModal";
import Image from "next/image";
import HouseFallback from "../../public/house_fallback.png";
import { DBProject } from "@shared/types/models";

interface ProjectsViewProps {
  initialProjects: DBProject[];
}

export function ProjectsView({ initialProjects }: ProjectsViewProps) {
  const [viewMode, setViewMode] = useState<"projects" | "generated">(
    "projects"
  );
  const [filter, setFilter] = useState<"all" | "vertical" | "landscape">("all");
  const [projects, setProjects] = useState<DBProject[]>(initialProjects);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DBProject | null>(
    null
  );

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsWorkflowModalOpen(true);
  };

  const handleOpenProject = (project: DBProject) => {
    setSelectedProject(project);
    setIsWorkflowModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsWorkflowModalOpen(false);
    setSelectedProject(null);
  };

  const handleProjectCreated = (project: DBProject) => {
    // Check if project already exists and update it, otherwise add it
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    if (existingIndex >= 0) {
      // Update existing project
      const updatedProjects = [...projects];
      updatedProjects[existingIndex] = project;
      setProjects(updatedProjects);
    } else {
      // Add new project
      setProjects([...projects, project]);
    }
    setIsWorkflowModalOpen(false);
    setSelectedProject(null);
  };

  // Remove duplicates and apply filter
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.id, p])).values()
  );
  const filteredProjects = uniqueProjects.filter((project) => {
    if (filter === "all") return true;
    return project.format === filter;
  });

  // Show empty state if no projects exist
  if (projects.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <EmptyState onCreateProject={handleCreateProject} />
        <ProjectWorkflowModal
          isOpen={isWorkflowModalOpen}
          onClose={handleCloseModal}
          onProjectCreated={handleProjectCreated}
          existingProject={selectedProject}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-2">
            {viewMode === "projects" ? "Your Projects" : "Generated Content"}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {viewMode === "projects"
              ? "AI-generated home walkthrough videos optimized for social media"
              : "Content generated from your project templates"}
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors flex items-center gap-2 justify-center sm:justify-start"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("projects")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            viewMode === "projects"
              ? "text-black"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          Projects
          {viewMode === "projects" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
          )}
        </button>
        <button
          onClick={() => setViewMode("generated")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            viewMode === "generated"
              ? "text-black"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          <Sparkles size={16} />
          Generated Content
          {viewMode === "generated" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
          )}
        </button>
      </div>

      {viewMode === "projects" && (
        <>
          {/* Filter Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 text-sm sm:text-base ${
                filter === "all"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              All Videos
            </button>
            <button
              onClick={() => setFilter("vertical")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 text-sm sm:text-base ${
                filter === "vertical"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              <Video size={16} />
              <span className="hidden xs:inline">Vertical</span>{" "}
              <span>(9:16)</span>
            </button>
            <button
              onClick={() => setFilter("landscape")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 text-sm sm:text-base ${
                filter === "landscape"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              <LayoutGrid size={16} />
              <span className="hidden xs:inline">Landscape</span>{" "}
              <span>(16:9)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpenProject(project)}
                className="bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow group cursor-pointer"
              >
                <div className="relative aspect-video bg-linear-to-br from-[#d4c4b0] to-[#e8ddd3] overflow-hidden">
                  {project.format === "vertical" ? (
                    <>
                      {/* Blurred background - TikTok style */}
                      <Image
                        src={project.thumbnailUrl || HouseFallback}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                      />
                      {/* Main centered vertical video */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src={project.thumbnailUrl || HouseFallback}
                          alt={project.title || "Undefined"}
                          className="h-full w-auto object-cover"
                        />
                      </div>
                    </>
                  ) : (
                    <Image
                      src={project.thumbnailUrl || HouseFallback}
                      alt={project.title || "Undefined"}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
                      <Play size={24} fill="black" stroke="black" />
                    </button>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {project.subtitles && (
                      <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                        CC
                      </div>
                    )}
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {project.format === "vertical" ? "9:16" : "16:9"}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {project.duration}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 truncate">{project.title}</h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        {project.status}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.platform}
                      </p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground ml-2">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProjectWorkflowModal
        isOpen={isWorkflowModalOpen}
        onClose={handleCloseModal}
        onProjectCreated={handleProjectCreated}
        existingProject={selectedProject}
      />
    </div>
  );
}
