import { useParams, useLocation, Link, Route, Switch } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import { 
  Edit3, Grid, ListTree, BookOpen, 
  ExternalLink, Share2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useProjectChapters } from "@/hooks/use-project";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Project() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { data: project, isLoading, error } = useProject(id || '');
  const { data: chapters, isLoading: chaptersLoading } = useProjectChapters(id || '');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");

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

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <div className="w-64 h-full">
        <SidebarNavigation />
      </div>
      
      <main className="flex-grow overflow-auto flex flex-col">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-background z-10">
          <div className="flex items-center">
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="text-xl font-semibold">{project?.title}</h1>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button 
              variant="ghost" 
              className="flex items-center gap-1"
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
              className="flex items-center gap-1"
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
          <div className="p-6 max-w-5xl mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{project?.title}</h1>
              <p className="text-muted-foreground">
                Created on {formattedDate}
              </p>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Description</CardTitle>
                    <CardDescription>Details about your project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{project?.description || "No description provided."}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Button onClick={() => setLocation(`/project/${id}/write`)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Start Writing
                      </Button>
                      <Button variant="outline" onClick={() => setLocation(`/project/${id}/outline`)}>
                        <ListTree className="mr-2 h-4 w-4" /> View Outline
                      </Button>
                      <Button variant="outline" onClick={() => setLocation(`/project/${id}/story-bible`)}>
                        <BookOpen className="mr-2 h-4 w-4" /> Story Bible
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="chapters" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chapters</CardTitle>
                    <CardDescription>Manage your project chapters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chaptersLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : chapters && chapters.length > 0 ? (
                      <div className="space-y-3">
                        {chapters.map((chapter) => (
                          <div key={chapter.id} className="border rounded-md p-3 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{chapter.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {chapter.isDraft ? "Draft" : "Published"}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setLocation(`/project/${id}/write?chapter=${chapter.id}`)}
                            >
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="mb-4">No chapters yet.</p>
                        <Button onClick={() => setLocation(`/project/${id}/write`)}>
                          Create First Chapter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="statistics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Statistics</CardTitle>
                    <CardDescription>Insights about your writing progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Chapters</h4>
                        <p className="text-2xl font-bold">{chapters?.length || 0}</p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Words</h4>
                        <p className="text-2xl font-bold">Coming soon</p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Pages</h4>
                        <p className="text-2xl font-bold">Coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Show navigation tabs for project feature pages
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <TabsList className="mx-4 h-10 w-auto">
              <Link href={`/project/${id}/write`}>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-none cursor-pointer",
                  location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                )}>
                  <Edit3 className="mr-1 h-4 w-4" /> Write
                </div>
              </Link>
              
              <Link href={`/project/${id}/storyboard`}>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-none cursor-pointer",
                  location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                )}>
                  <Grid className="mr-1 h-4 w-4" /> Storyboard
                </div>
              </Link>
              
              <Link href={`/project/${id}/outline`}>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-none cursor-pointer",
                  location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                )}>
                  <ListTree className="mr-1 h-4 w-4" /> Outline
                </div>
              </Link>
              
              <Link href={`/project/${id}/story-bible`}>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-none cursor-pointer",
                  location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                )}>
                  <BookOpen className="mr-1 h-4 w-4" /> Story Bible
                </div>
              </Link>
            </TabsList>
          </div>
        )}
      </main>
    </div>
  );
}
