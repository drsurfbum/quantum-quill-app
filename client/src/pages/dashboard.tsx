import { Button } from "@/components/ui/button";
import SidebarNavigation from "@/components/sidebar-navigation";
import { useAuth } from "@/hooks/use-auth";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen">
      <div className="w-64 h-full">
        <SidebarNavigation />
      </div>
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome, {user?.username}</h1>
            <p className="text-muted-foreground">Manage your writing projects</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-card shadow-sm hover:shadow transition-shadow">
                <h3 className="font-medium mb-1">Create your first project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start your writing journey by creating a new project
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </div>
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
  );
}