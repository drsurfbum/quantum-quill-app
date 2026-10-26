import { Button } from "@/components/ui/button";
import SidebarNavigation from "@/components/sidebar-navigation";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import NewProjectWizard from "@/components/new-project-wizard";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { type Project } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  
  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);
  
  // Create project mutation
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Fetch projects
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Handle create project button click
  const handleCreateProject = () => setWizardOpen(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {wizardOpen && <NewProjectWizard key={user?.id} onClose={() => setWizardOpen(false)} />}
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full" style={{marginLeft: isCollapsed ? '56px' : '0'}}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Welcome, {user?.username}</h1>
              <p className="text-muted-foreground">Manage your writing projects</p>
            </div>
            <Button 
              data-tour="new-project" onClick={handleCreateProject}

              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          <div className="grid gap-6">
            <div data-tour="projects" tabIndex={-1} className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <p>Failed to load projects</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow transition-shadow">
                      <Link data-tour-project href={`/project/${project.id}`}>
                        <div className="p-4 cursor-pointer">
                          <h3 className="font-medium mb-1 truncate">{project.title}</h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {project.description || "No description"}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(project.createdAt || "").toLocaleDateString()}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 bg-card shadow-sm hover:shadow transition-shadow">
                    <h3 className="font-medium mb-1">Create your first project</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start your writing journey by creating a new project
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleCreateProject}

                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity to show</p>
                <p className="text-sm">Your recent actions will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
