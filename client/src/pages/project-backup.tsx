import { useParams, useLocation, Link, Route, Switch } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import { 
  Edit3, Grid, ListTree, BookOpen, 
  ExternalLink, Share2, Loader2, Pencil, MoreHorizontal,
  TrendingUp, FileText, Clock, Layers, PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useProjectChapters, useUpdateProject } from "@/hooks/use-project";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Project() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { data: project, isLoading, error } = useProject(id || '');
  const { data: chapters, isLoading: chaptersLoading } = useProjectChapters(id || '');
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  // State for edit project dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Handle errors
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Project not found</h1>
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or has been deleted.</p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Set default active tab for child routes
  if (location === `/project/${id}`) {
    // Don't redirect, just show the project overview
    // This replaces the previous behavior of redirecting to write tab
  }

  // Format date if available
  const formattedDate = project?.createdAt ? 
    format(new Date(project.createdAt), 'MMM d, yyyy') : 
    'Unknown date';
    
  // Handler for opening edit dialog
  const handleOpenEditDialog = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || "");
      setEditDialogOpen(true);
    }
  };
  
  // Handler for saving project edits
  const handleSaveProject = () => {
    if (!id) return;
    
    updateProject(
      {
        id: Number(id),
        title: editTitle,
        description: editDescription
      },
      {
        onSuccess: () => {
          toast({
            title: "Project updated",
            description: "Your project has been updated successfully."
          });
          setEditDialogOpen(false);
        },
        onError: () => {
          toast({
            title: "Error updating project",
            description: "There was an error updating your project. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
          <SidebarNavigation onCollapsedChange={setIsCollapsed} />
          
          <main className="flex-grow overflow-auto flex flex-col w-full" style={{ marginLeft: isMobile && isCollapsed ? '56px' : '0' }}>
          <header className="min-h-16 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 sticky top-0 bg-background z-10">
            <div className="flex items-center mr-4">
              {isLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <h1 className="text-lg sm:text-xl font-semibold truncate max-w-[200px] sm:max-w-xs">{project?.title}</h1>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="ghost" 
                className="flex items-center gap-1 px-2 sm:px-4"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Sharing functionality will be available in a future update.",
                  });
                }}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              
              <Button 
                variant="outline"
                className="flex items-center gap-1 px-2 sm:px-4"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Export functionality will be available in a future update.",
                  });
                }}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </header>

          {/* Show project overview on base route */}
          {location === `/project/${id}` ? (
            <div className="p-6 max-w-6xl mx-auto w-full">
              {/* Enhanced Header with better hierarchy */}
              <div className="mb-8 flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2 text-foreground">{project?.title}</h1>
                  <p className="text-sm text-muted-foreground opacity-75">
                    Created on {formattedDate}
                  </p>
                </div>
                
                {/* Streamlined toolbar */}
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleOpenEditDialog}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Share functionality will be available in a future update.",
                        });
                      }}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toast({
                          title: "Coming Soon", 
                          description: "Export functionality will be available in a future update.",
                        });
                      }}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Project Progress Section */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Word Count</p>
                        <p className="text-xl font-semibold">{chapters?.reduce((acc, ch) => acc + (ch.content?.length || 0), 0) || 0}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Chapters</p>
                        <p className="text-xl font-semibold">{chapters?.length || 0}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="text-xl font-semibold">{project?.updatedAt ? format(new Date(project.updatedAt), 'MMM d') : 'Never'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Project Progress</span>
                    <span className="text-sm text-muted-foreground">{Math.min(100, Math.floor((chapters?.length || 0) * 8.33))}% complete</span>
                  </div>
                  <Progress value={Math.min(100, Math.floor((chapters?.length || 0) * 8.33))} className="h-2" />
                </div>
              </div>

              {/* Enhanced Tabs */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="chapters" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Chapters ({chapters?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="statistics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Statistics
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6">
                  {/* Project Description Section */}
                  <div className="mb-8 space-y-6">
                    {/* Description Card - Simplified */}
                    <Card className="border border-border/50">
                      <CardContent className="pt-6">
                        <div className="mb-4">
                          <h3 className="text-base font-medium text-muted-foreground mb-3">About This Project</h3>
                          <p className="text-foreground leading-relaxed text-base">
                            {project?.description || "No description provided yet. Click 'Edit Project' to add a description."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Project Tools Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Writing Tools</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Button 
                          onClick={() => setLocation(`/project/${id}/write`)}
                          className="h-auto flex flex-col items-center gap-3 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
                        >
                          <PenTool className="h-6 w-6" />
                          <div className="text-center">
                            <span className="font-medium block">Start Writing</span>
                            <span className="text-xs opacity-90">Create and edit chapters</span>
                          </div>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => setLocation(`/project/${id}/storyboard`)}
                          className="h-auto flex flex-col items-center gap-3 py-6 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                        >
                          <Layers className="h-6 w-6" />
                          <div className="text-center">
                            <span className="font-medium block">Storyboard</span>
                            <span className="text-xs text-muted-foreground">Visual story planning</span>
                          </div>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => setLocation(`/project/${id}/outline`)}
                          className="h-auto flex flex-col items-center gap-3 py-6 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                        >
                          <ListTree className="h-6 w-6" />
                          <div className="text-center">
                            <span className="font-medium block">Outline</span>
                            <span className="text-xs text-muted-foreground">Structure your story</span>
                          </div>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => setLocation(`/project/${id}/story-bible`)}
                          className="h-auto flex flex-col items-center gap-3 py-6 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                        >
                          <BookOpen className="h-6 w-6" />
                          <div className="text-center">
                            <span className="font-medium block">Story Bible</span>
                            <span className="text-xs text-muted-foreground">Characters & world</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="chapters" className="mt-6">
                  <Card className="shadow-sm border border-border/50">
                    <CardHeader className="border-b border-border/50 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Chapters</CardTitle>
                          <CardDescription>Manage your project chapters</CardDescription>
                        </div>
                        <Button 
                          onClick={() => setLocation(`/project/${id}/write`)}
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          New Chapter
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {chaptersLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : chapters && chapters.length > 0 ? (
                        <div className="space-y-3">
                          {chapters.map((chapter, index) => (
                            <div key={chapter.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded">
                                      {index + 1}
                                    </span>
                                    <h4 className="font-semibold">{chapter.title}</h4>
                                    {chapter.isDraft && (
                                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                                        Draft
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{chapter.content ? `${chapter.content.replace(/<[^>]*>/g, '').length} characters` : '0 characters'}</span>
                                    <span>Updated {chapter.updatedAt ? format(new Date(chapter.updatedAt), 'MMM d, yyyy') : 'Unknown'}</span>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/project/${id}/write?chapter=${chapter.id}`)}
                                  className="hover:bg-primary hover:text-primary-foreground"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="mb-4">
                            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No chapters yet</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                              Start writing your story by creating your first chapter.
                            </p>
                          </div>
                          <Button 
                            onClick={() => setLocation(`/project/${id}/write`)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Create First Chapter
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="statistics" className="mt-6">
                  <div className="space-y-6">
                    {/* Writing Progress Card */}
                    <Card className="shadow-sm border border-border/50">
                      <CardHeader className="border-b border-border/50 bg-muted/20">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Writing Progress
                        </CardTitle>
                        <CardDescription>Track your writing achievements</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="border rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Chapters</h4>
                            <p className="text-2xl font-bold">{chapters?.length || 0}</p>
                          </div>
                          
                          <div className="border rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                            </div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Characters</h4>
                            <p className="text-2xl font-bold">
                              {chapters?.reduce((acc, ch) => acc + (ch.content?.replace(/<[^>]*>/g, '').length || 0), 0).toLocaleString() || 0}
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                <Edit3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                            </div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Draft Chapters</h4>
                            <p className="text-2xl font-bold">
                              {chapters?.filter(ch => ch.isDraft).length || 0}
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              </div>
                            </div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                            <p className="text-sm font-bold">
                              {chapters && chapters.length > 0 
                                ? (() => {
                                    const validDates = chapters
                                      .map(ch => ch.updatedAt ? new Date(ch.updatedAt).getTime() : 0)
                                      .filter(time => time > 0);
                                    return validDates.length > 0 
                                      ? format(new Date(Math.max(...validDates)), 'MMM d')
                                      : 'Never';
                                  })()
                                : 'Never'
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Chapter Breakdown */}
                    {chapters && chapters.length > 0 && (
                      <Card className="shadow-sm border border-border/50">
                        <CardHeader className="border-b border-border/50 bg-muted/20">
                          <CardTitle className="text-lg">Chapter Breakdown</CardTitle>
                          <CardDescription>Individual chapter statistics</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            {chapters
                              .sort((a, b) => a.order - b.order)
                              .map((chapter, index) => {
                                const characterCount = chapter.content?.replace(/<[^>]*>/g, '').length || 0;
                                const maxChars = Math.max(...chapters.map(ch => ch.content?.replace(/<[^>]*>/g, '').length || 0));
                                const percentage = maxChars > 0 ? (characterCount / maxChars) * 100 : 0;
                                
                                return (
                                  <div key={chapter.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded min-w-[2rem] text-center">
                                      {index + 1}
                                    </span>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{chapter.title}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {characterCount.toLocaleString()} characters
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Progress value={percentage} className="h-2 flex-1" />
                                        {chapter.isDraft && (
                                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                                            Draft
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Show navigation tabs for project feature pages
            <div className="border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
              <div className="flex min-w-max mx-2 md:mx-4 h-10 w-auto">
                <Link href={`/project/${id}/write`}>
                  <div className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                    location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                  )}>
                    <Edit3 className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Write</span>
                  </div>
                </Link>
                
                <Link href={`/project/${id}/storyboard`}>
                  <div className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                    location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                  )}>
                    <Grid className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Storyboard</span>
                  </div>
                </Link>
                
                <Link href={`/project/${id}/outline`}>
                  <div className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                    location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                  )}>
                    <ListTree className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Outline</span>
                  </div>
                </Link>
                
                <Link href={`/project/${id}/story-bible`}>
                  <div className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                    location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                  )}>
                    <BookOpen className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Story Bible</span>
                  </div>
                </Link>
              </div>
            </div>
          )}
          </main>
        </div>
      </div>
      
      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to your project details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectTitle">Project Title</Label>
              <Input
                id="projectTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description (optional)</Label>
              <Textarea
                id="projectDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter project description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProject} 
              disabled={!editTitle.trim() || isUpdating}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
