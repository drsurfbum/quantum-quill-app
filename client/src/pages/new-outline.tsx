import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateOutlineItem } from '@/hooks/use-outline-api';
import { OutlineProvider, useOutline } from '@/contexts/outline-context';
import { NewOutlineItem } from '@/components/outline/new-outline-item';
import { NewOutlineRichEditor } from '@/components/outline/new-outline-rich-editor';
import { apiRequest } from '@/lib/queryClient';
import SidebarNavigation from '@/components/sidebar-navigation';
import ExportModal from '@/components/export-modal';

import {
  PanelLeft,
  PanelRightClose,
  Share2,
  ExternalLink,
  Edit3,
  Grid,
  ListTree,
  BookOpen,
  Plus,
} from 'lucide-react';

interface Project {
  id: number;
  title: string;
  description: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  isTrashed: boolean;
}

function OutlineContent() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [location] = useLocation();
  const { toast } = useToast();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOutlineSidebarVisible, setIsOutlineSidebarVisible] = useState(true);
  
  // Get project details
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${id}`);
      return await res.json();
    },
  });
  
  const { mutate: createItem, isPending: isCreating } = useCreateOutlineItem();
  const { selectItem, selectedItemId, getItemById, getRootItems } = useOutline();
  
  const rootItems = getRootItems();
  const selectedItem = getItemById(selectedItemId);
  
  // Handler for creating a new outline item
  const handleCreateItem = (parentId: number | null = null) => {
    createItem(
      {
        projectId,
        title: "New Section",
        parentId
      },
      {
        onSuccess: (newItem) => {
          toast({
            title: "Section created",
            description: "New outline section has been created."
          });
          
          // Select the newly created item
          selectItem(newItem.id);
        },
        onError: (error) => {
          console.error("Create error:", error);
          toast({
            title: "Error creating section",
            description: "There was an error creating your outline section. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        
        <main className="flex-grow overflow-hidden flex flex-col w-full pl-0 md:pl-0" style={{marginLeft: isCollapsed ? '56px' : '0'}}>
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2"
              onClick={() => setIsOutlineSidebarVisible(!isOutlineSidebarVisible)}
              aria-label={isOutlineSidebarVisible ? "Hide outline list" : "Show outline list"}
            >
              {isOutlineSidebarVisible ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
            {isLoadingProject ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="text-xl font-semibold">{project?.title}</h1>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            
            {project && <ExportModal projectId={project.id} projectTitle={project.title} />}
            
            <Button className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </div>
        </header>

        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <Tabs defaultValue="outline">
            <TabsList className="mx-4 h-10 w-auto">
              <Link href={`/project/${id}/write`}>
                <TabsTrigger value="write" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                )}>
                  <Edit3 className="mr-1 h-4 w-4" /> Write
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/storyboard`}>
                <TabsTrigger value="storyboard" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                )}>
                  <Grid className="mr-1 h-4 w-4" /> Storyboard
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/outline`}>
                <TabsTrigger value="outline" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                )}>
                  <ListTree className="mr-1 h-4 w-4" /> Outline
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/story-bible`}>
                <TabsTrigger value="story-bible" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                )}>
                  <BookOpen className="mr-1 h-4 w-4" /> Story Bible
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Outline Structure Sidebar */}
          <div className={cn(
            "border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900",
            "absolute md:static transition-all duration-300 z-10",
            isOutlineSidebarVisible ? "w-64 translate-x-0" : "w-0 -translate-x-full md:hidden"
          )}>
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-medium">Outline</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleCreateItem()}
                disabled={isCreating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2">
              {isLoadingProject ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : rootItems.length === 0 ? (
                <div className="text-center p-4 text-sm text-neutral-500 dark:text-neutral-400">
                  No outline sections yet. 
                  <Button 
                    variant="link" 
                    onClick={() => handleCreateItem()}
                    disabled={isCreating}
                    className="p-0 h-auto font-normal text-sm"
                  >
                    Create one
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {rootItems.map(item => (
                    <NewOutlineItem 
                      key={item.id}
                      item={item}
                      onCreateItem={handleCreateItem}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Outline Content Editor */}
          <div className={cn(
            "flex-grow flex flex-col overflow-hidden transition-all duration-300",
            isOutlineSidebarVisible ? "md:ml-0" : "ml-0"
          )}>
            {isLoadingProject ? (
              <div className="flex-grow flex items-center justify-center p-6">
                <Skeleton className="h-40 w-full max-w-2xl" />
              </div>
            ) : !selectedItem ? (
              <div className="flex-grow flex items-center justify-center text-center p-6">
                <div>
                  <ListTree className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a section</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
                    Select a section from the outline to edit its content, or create a new section to get started.
                  </p>
                  <Button 
                    onClick={() => handleCreateItem()}
                    disabled={isCreating}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create a section
                  </Button>
                </div>
              </div>
            ) : (
              <NewOutlineRichEditor projectId={projectId} />
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

export default function NewOutlinePage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  
  return (
    <OutlineProvider projectId={projectId}>
      <OutlineContent />
    </OutlineProvider>
  );
}