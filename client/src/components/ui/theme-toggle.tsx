import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dark-mode"
        checked={theme === "dark"}
        onCheckedChange={toggleTheme}
      />
      <Label htmlFor="dark-mode" className="sr-only">
        Toggle theme
      </Label>
      <div className="flex items-center">
        {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </div>
    </div>
  );
}
