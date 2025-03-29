import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";
import Write from "@/pages/write";
import Storyboard from "@/pages/storyboard";
import Outline from "@/pages/outline";
import StoryBible from "@/pages/story-bible";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/project/:id" component={Project} />
      <Route path="/project/:id/write" component={Write} />
      <Route path="/project/:id/storyboard" component={Storyboard} />
      <Route path="/project/:id/outline" component={Outline} />
      <Route path="/project/:id/story-bible" component={StoryBible} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
