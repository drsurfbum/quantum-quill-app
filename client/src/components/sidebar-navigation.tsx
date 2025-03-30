import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Home, 
  Layers, 
  PenTool, 
  Sparkles,
  Menu,
  ChevronLeft,
  ListTree,
  Grid
} from "lucide-react";
import UserProfile from "./user-profile";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type Project } from "@shared/schema";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  className?: string;
  compact?: boolean;
}

function NavItem({ href, icon, label, isActive, className, compact = false }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent cursor-pointer",
          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
          compact ? "justify-center" : "",
          className
        )}
      >
        {icon}
        {!compact && <span>{label}</span>}
        {compact && <span className="sr-only">{label}</span>}
      </div>
    </Link>
  );
}

interface ProjectNavProps {
  projectId: number | string | undefined;
  location: string;
  compact?: boolean;
}

function ProjectNav({ projectId, location, compact = false }: ProjectNavProps) {
  if (!projectId) return null;
  
  const isInProject = location.includes(`/project/${projectId}`);
  if (!isInProject && compact) return null;
  
  return (
    <div className={cn("mt-4", compact && "mt-0")}>
      {!compact && (
        <h3 className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">
          Project Tools
        </h3>
      )}
      <div className={cn("mt-1 space-y-1", compact && "space-y-2")}>
        <NavItem 
          href={`/project/${projectId}/write`} 
          icon={<PenTool className={compact ? "h-5 w-5" : "h-4 w-4"} />} 
          label="Write" 
          isActive={location.includes(`/project/${projectId}/write`)}
          compact={compact}
          className={compact ? "hover:bg-primary/10 hover:text-primary" : ""}
        />
        <NavItem 
          href={`/project/${projectId}/storyboard`} 
          icon={<Layers className={compact ? "h-5 w-5" : "h-4 w-4"} />} 
          label="Storyboard" 
          isActive={location.includes(`/project/${projectId}/storyboard`)}
          compact={compact}
          className={compact ? "hover:bg-primary/10 hover:text-primary" : ""}
        />
        <NavItem 
          href={`/project/${projectId}/outline`} 
          icon={<BookOpen className={compact ? "h-5 w-5" : "h-4 w-4"} />} 
          label="Outline" 
          isActive={location.includes(`/project/${projectId}/outline`)}
          compact={compact}
          className={compact ? "hover:bg-primary/10 hover:text-primary" : ""}
        />
        <NavItem 
          href={`/project/${projectId}/story-bible`} 
          icon={<Sparkles className={compact ? "h-5 w-5" : "h-4 w-4"} />} 
          label="Story Bible" 
          isActive={location.includes(`/project/${projectId}/story-bible`)}
          compact={compact}
          className={compact ? "hover:bg-primary/10 hover:text-primary" : ""}
        />
      </div>
    </div>
  );
}

export default function SidebarNavigation({ onCollapsedChange }: { onCollapsedChange?: (collapsed: boolean) => void } = {}) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
      if (onCollapsedChange) {
        onCollapsedChange(true);
      }
    }
  }, [isMobile, onCollapsedChange]);
  
  // Extract project ID from URL if present
  const projectIdMatch = location.match(/\/project\/([^\/]+)/);
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : undefined;
  
  // Fetch current project if we have an ID
  const { data: currentProject } = useQuery<Project>({
    queryKey: currentProjectId ? [`/api/projects/${currentProjectId}`] : [],
    enabled: !!currentProjectId
  });

  // Separate sidebar toggle button for mobile
  const SidebarToggle = () => (
    <button 
      className={cn(
        "fixed top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all",
        isCollapsed ? "left-4" : "left-[210px]"
      )}
      onClick={() => {
        const newCollapsedState = !isCollapsed;
        setIsCollapsed(newCollapsedState);
        if (onCollapsedChange) {
          onCollapsedChange(newCollapsedState);
        }
      }}
      aria-label={isCollapsed ? "Open menu" : "Close menu"}
    >
      {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
    </button>
  );

  // When the sidebar is collapsed, show a compact mini-sidebar
  const MiniSidebar = () => {
    if (!isCollapsed) return null;
    
    // Determine if we're currently on a project page
    const isInProject = location.includes('/project/');
    
    return (
      <div className="fixed top-0 left-0 bottom-0 z-40 flex flex-col items-center p-2 pt-20 space-y-4 shadow-md bg-background border-r w-14 bg-opacity-95 backdrop-blur-sm overflow-y-auto">
        {/* Dashboard icon */}
        <NavItem 
          href="/" 
          icon={<Home className="h-5 w-5" />} 
          label="Dashboard" 
          isActive={location === "/"} 
          compact={true}
          className="hover:bg-primary/10 hover:text-primary"
        />
        
        {/* Project icon */}
        {currentProjectId && (
          <>
            <NavItem 
              href={`/project/${currentProjectId}`}
              icon={<BookOpen className="h-5 w-5" />}
              label="Project"
              isActive={location === `/project/${currentProjectId}`}
              compact={true}
              className="hover:bg-primary/10 hover:text-primary"
            />
            
            {isInProject && (
              <div className="border-t w-8 my-1 opacity-50"></div>
            )}
            
            {/* Project tools in compact mode */}
            {isInProject && (
              <div className="flex flex-col items-center gap-2">
                <NavItem 
                  href={`/project/${currentProjectId}/write`}
                  icon={<PenTool className="h-5 w-5" />}
                  label="Write"
                  isActive={location.includes(`/project/${currentProjectId}/write`)}
                  compact={true}
                  className="hover:bg-primary/10 hover:text-primary"
                />
                <NavItem 
                  href={`/project/${currentProjectId}/outline`}
                  icon={<BookOpen className="h-5 w-5" />}
                  label="Outline"
                  isActive={location.includes(`/project/${currentProjectId}/outline`)}
                  compact={true} 
                  className="hover:bg-primary/10 hover:text-primary"
                />
                <NavItem 
                  href={`/project/${currentProjectId}/story-bible`}
                  icon={<Sparkles className="h-5 w-5" />}
                  label="Story Bible"
                  isActive={location.includes(`/project/${currentProjectId}/story-bible`)}
                  compact={true}
                  className="hover:bg-primary/10 hover:text-primary"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && <SidebarToggle />}
      <MiniSidebar />
      
      <div 
        className={cn(
          "flex flex-col h-full border-r bg-background transition-all duration-300",
          isCollapsed && isMobile ? "w-0 opacity-0 -translate-x-full" : "w-[250px] opacity-100"
        )}
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Quantum Quill</h2>
          <p className="text-sm text-muted-foreground">Your writing companion</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            <NavItem 
              href="/" 
              icon={<Home className="h-4 w-4" />} 
              label="Dashboard" 
              isActive={location === "/"} 
            />
            
            {currentProject && (
              <div className="py-2">
                <div className="text-xs text-muted-foreground px-2 mb-1">
                  Current Project:
                </div>
                <NavItem 
                  href={`/project/${currentProjectId}`}
                  icon={<BookOpen className="h-4 w-4" />}
                  label={currentProject.title}
                  isActive={location === `/project/${currentProjectId}`}
                  className="bg-muted font-medium"
                />
              </div>
            )}
            
            {/* Project-specific navigation */}
            <ProjectNav projectId={currentProjectId} location={location} />
          </div>
        </ScrollArea>
        <UserProfile />
      </div>
    </>
  );
}