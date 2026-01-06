"use client";

import { Home, LogOut, Menu, X } from "lucide-react";
import { useUser } from "@stackframe/stack";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const user = useUser({ or: "redirect" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "projects", label: "Projects", icon: Home }
    // { id: "editor", label: "Video Editor", icon: Video },
    // { id: "social", label: "Social Media", icon: Share2 },
    // { id: "settings", label: "Settings", icon: Settings },
  ];

  const getUserInitials = () => {
    if (!user?.displayName) return "U";
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await user?.signOut();
    window.location.href = "/handler/sign-in";
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 h-screen bg-white border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl tracking-tight">zencourt</h1>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  activeTab === item.id
                    ? "bg-black text-white"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-border">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.primaryEmail}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log out
              </Button>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl tracking-tight">zencourt</h1>
          <div className="flex items-center gap-2">
            {user && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-border transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl tracking-tight">zencourt</h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Drawer Navigation */}
        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  activeTab === item.id
                    ? "bg-black text-white"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer User Profile Section */}
        <div className="p-4 border-t border-border">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.primaryEmail}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log out
              </Button>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
