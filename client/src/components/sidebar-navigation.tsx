import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Home, 
  Layers, 
  PenTool, 
  Sparkles
} from "lucide-react";
import UserProfile from "./user-profile";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type Project } from "@shared/schema";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  className?: string;
}

function NavItem({ href, icon, label, isActive, className }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent cursor-pointer",
          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
          className
        )}
      >
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

interface ProjectNavProps {
  projectId: number | string | undefined;
  location: string;
}

function ProjectNav({ projectId, location }: ProjectNavProps) {
  if (!projectId) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">
        Project Tools
      </h3>
      <div className="mt-1">
        <NavItem 
          href={`/project/${projectId}/write`} 
          icon={<PenTool className="h-4 w-4" />} 
          label="Write" 
          isActive={location.includes(`/project/${projectId}/write`)}
        />
        <NavItem 
          href={`/project/${projectId}/storyboard`} 
          icon={<Layers className="h-4 w-4" />} 
          label="Storyboard" 
          isActive={location.includes(`/project/${projectId}/storyboard`)}
        />
        <NavItem 
          href={`/project/${projectId}/outline`} 
          icon={<BookOpen className="h-4 w-4" />} 
          label="Outline" 
          isActive={location.includes(`/project/${projectId}/outline`)}
        />
        <NavItem 
          href={`/project/${projectId}/story-bible`} 
          icon={<Sparkles className="h-4 w-4" />} 
          label="Story Bible" 
          isActive={location.includes(`/project/${projectId}/story-bible`)}
        />
      </div>
    </div>
  );
}

export default function SidebarNavigation() {
  const [location] = useLocation();
  
  // Extract project ID from URL if present
  const projectIdMatch = location.match(/\/project\/([^\/]+)/);
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : undefined;
  
  // Fetch current project if we have an ID
  const { data: currentProject } = useQuery<Project>({
    queryKey: currentProjectId ? [`/api/projects/${currentProjectId}`] : [],
    enabled: !!currentProjectId
  });

  return (
    <div className="flex flex-col h-full border-r">
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
  );
}