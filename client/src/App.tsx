import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppStateProvider } from "@/contexts/app-state-context";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";
import Write from "@/pages/write";
import Storyboard from "@/pages/storyboard";
import Outline from "@/pages/outline";
import StoryBible from "@/pages/story-bible";
import AuthPage from "@/pages/auth-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/project/:id" component={Project} />
      <ProtectedRoute path="/project/:id/write" component={Write} />
      <ProtectedRoute path="/project/:id/storyboard" component={Storyboard} />
      <ProtectedRoute path="/project/:id/outline" component={Outline} />
      <ProtectedRoute path="/project/:id/story-bible" component={StoryBible} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <Router />
          <Toaster />
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
