import { Plus, Video } from "lucide-react";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="mb-6 relative">
        {/* Icon container with gradient background */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#e8ddd3] to-[#d4c4b0] flex items-center justify-center mx-auto mb-4">
          <Video size={48} className="text-black/70" strokeWidth={1.5} />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-medium mb-3 text-foreground">
        No projects yet
      </h2>

      <p className="text-muted-foreground text-sm sm:text-base max-w-md mb-8">
        Create your first AI-generated property video. Upload your listing
        photos and let our AI transform them into engaging social media content.
      </p>

      <button
        onClick={onCreateProject}
        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors flex items-center gap-2 text-base font-medium"
      >
        <Plus size={20} />
        Create New Project
      </button>
    </div>
  );
}
