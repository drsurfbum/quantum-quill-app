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

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        {icon}
        <span>{label}</span>
      </a>
    </Link>
  );
}

export default function SidebarNavigation() {
  const [location] = useLocation();

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
          <NavItem 
            href="/write" 
            icon={<PenTool className="h-4 w-4" />} 
            label="Write" 
            isActive={location === "/write"}
          />
          <NavItem 
            href="/storyboard" 
            icon={<Layers className="h-4 w-4" />} 
            label="Storyboard" 
            isActive={location === "/storyboard"}
          />
          <NavItem 
            href="/outline" 
            icon={<BookOpen className="h-4 w-4" />} 
            label="Outline" 
            isActive={location === "/outline"}
          />
          <NavItem 
            href="/story-bible" 
            icon={<Sparkles className="h-4 w-4" />} 
            label="Story Bible" 
            isActive={location === "/story-bible"}
          />
        </div>
      </ScrollArea>
      <UserProfile />
    </div>
  );
}