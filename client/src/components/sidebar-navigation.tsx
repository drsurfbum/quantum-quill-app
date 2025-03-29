import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FolderPlus,
  LayoutDashboard,
  History,
  Trash2,
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { type Project } from "@shared/schema";
import { useCreateProject } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";

export default function SidebarNavigation() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: createProject, isPending } = useCreateProject();
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

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
          window.location.href = `/project/${data.id}/write`;
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

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-neutral-800 shadow-md"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside className={cn(
        "w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col overflow-hidden",
        "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* App Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <span className="text-accent font-bold text-2xl">QQ</span>
            <span className="font-semibold text-lg">Quantum Quill</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <ScrollArea className="flex-grow">
          <div className="px-3 py-4">
            <Button 
              className="w-full"
              onClick={handleCreateProject}
              disabled={isPending}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="px-3 mb-1">
            <h3 className="text-xs uppercase font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider">
              Workspace
            </h3>
          </div>
          
          <nav className="space-y-1 px-2">
            <Link href="/">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/" 
                  ? "bg-primary text-white" 
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </a>
            </Link>
            
            <Link href="/?tab=recent">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/?tab=recent" 
                  ? "bg-primary text-white" 
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}>
                <History className="mr-2 h-4 w-4" />
                Recent
              </a>
            </Link>
            
            <Link href="/?tab=trash">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/?tab=trash" 
                  ? "bg-primary text-white" 
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}>
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </a>
            </Link>
          </nav>

          <div className="px-3 mt-6 mb-1">
            <h3 className="text-xs uppercase font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider">
              My Projects
            </h3>
          </div>
          
          <nav className="space-y-1 px-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}/write`}>
                <a className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                  location.includes(`/project/${project.id}`) 
                    ? "bg-primary bg-opacity-10 text-primary dark:bg-primary-dark dark:bg-opacity-10" 
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {project.title}
                </a>
              </Link>
            ))}
            
            {projects.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                No projects yet
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* User Profile Section */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white">
              <span>JD</span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium">Jane Doe</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">jane@example.com</div>
            </div>
            <button className="ml-auto p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
