export function SidebarSkeleton() {
  return (
    <aside className="w-[260px] shrink-0 flex flex-col bg-secondary">
      {/* Logo Section */}
      <div className="pt-5 flex items-center px-6 gap-3 pb-2">
        <div className="h-6 w-6 rounded-md bg-border/60 animate-pulse" />
        <div className="h-6 w-24 rounded-md bg-border/60 animate-pulse" />
      </div>

      {/* Divider */}
      <div className="px-4 pt-4">
        <div className="h-px bg-border w-full" />
      </div>

      {/* Navigation skeleton */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="flex flex-col pt-4 gap-1">
          <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
          <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
        </div>

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Content section skeleton */}
        <div className="space-y-1 -mt-1">
          <div className="px-3 py-2">
            <div className="h-3 w-16 rounded-md bg-border/60 animate-pulse" />
          </div>
          <div className="space-y-0.5 pl-2">
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
          </div>
        </div>

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Listings section skeleton */}
        <div className="space-y-1 -mt-1">
          <div className="px-3 py-2">
            <div className="h-3 w-16 rounded-md bg-border/60 animate-pulse" />
          </div>
          <div className="space-y-0.5 pl-2">
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
          </div>
        </div>

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Manage section skeleton */}
        <div className="space-y-1">
          <div className="px-3 py-2">
            <div className="h-3 w-14 rounded-md bg-border/60 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 mb-4">
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-border/40 animate-pulse" />
          </div>
        </div>
      </nav>

      {/* User Profile skeleton */}
      <div className="p-4 pt-0">
        <div className="pb-4">
          <div className="h-px bg-border w-full" />
        </div>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-10 w-10 rounded-full bg-border/60 animate-pulse" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-4 w-24 rounded-md bg-border/60 animate-pulse" />
            <div className="h-3 w-16 rounded-md bg-border/40 animate-pulse" />
          </div>
        </div>
      </div>
    </aside>
  );
}
