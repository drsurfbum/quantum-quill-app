import { useQuery } from "@tanstack/react-query";
import SidebarNavigation from "@/components/sidebar-navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  BookOpen, Plus, FolderOpen, Clock, Trash2,
  Edit3, LayoutGrid, CalendarDays
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { type Project } from "@shared/schema";
import { useCreateProject } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const tab = new URLSearchParams(location.split("?")[1]).get("tab") || "projects";
  const [search, setSearch] = useState("");

  const { mutate: createProject, isPending } = useCreateProject();
  
  // Get all projects, including trashed ones
  const { data: allProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Filter projects based on current tab
  const projects = allProjects.filter(project => {
    if (tab === "trash") return project.isTrashed;
    return !project.isTrashed;
  });

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(search.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateProject = () => {
    createProject(
      { 
        title: "New Project", 
        description: "Project description" 
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Project created",
            description: "Your new project has been created successfully."
          });
          // Navigate to the new project
          setLocation(`/project/${data.id}/write`);
        },
        onError: () => {
          toast({
            title: "Error creating project",
            description: "There was an error creating your project. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <SidebarNavigation />
      
      <main className="flex-grow overflow-hidden flex flex-col">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <Button onClick={handleCreateProject} disabled={isPending}>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </div>
        </header>

        <div className="flex-grow overflow-auto p-4 sm:p-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex space-x-2 mb-4 sm:mb-0">
                <Button
                  variant={tab === "projects" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocation("/")}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  All Projects
                </Button>
                <Button
                  variant={tab === "recent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocation("/?tab=recent")}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Recent
                </Button>
                <Button
                  variant={tab === "trash" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocation("/?tab=trash")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Trash
                </Button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="pl-3 pr-10 py-2 border border-neutral-200 dark:border-neutral-800 rounded-md w-full sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="opacity-70 animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">No projects found</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {search ? "Try a different search term" : tab === "trash" ? "Your trash is empty" : "Create your first project to get started"}
              </p>
              {tab !== "trash" && (
                <Button onClick={handleCreateProject} disabled={isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Create a New Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="pb-3">
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription className="flex items-center text-xs">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {project.description || "No description provided"}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between">
                    {tab === "trash" ? (
                      <>
                        <Button variant="outline" size="sm">
                          Restore
                        </Button>
                        <Button variant="destructive" size="sm">
                          Delete Forever
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/project/${project.id}/write`}>
                          <Button size="sm" variant="outline">
                            <Edit3 className="mr-2 h-4 w-4" /> Write
                          </Button>
                        </Link>
                        <Link href={`/project/${project.id}/storyboard`}>
                          <Button size="sm" variant="outline">
                            <LayoutGrid className="mr-2 h-4 w-4" /> Storyboard
                          </Button>
                        </Link>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
