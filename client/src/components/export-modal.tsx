import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExportModalProps {
  projectId: string | number;
  projectTitle: string;
}

export default function ExportModal({ projectId, projectTitle }: ExportModalProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("pdf");
  const [includeChapters, setIncludeChapters] = useState(true);
  const [includeOutline, setIncludeOutline] = useState(true);
  const [includeStoryboard, setIncludeStoryboard] = useState(false);
  const [includeStoryBible, setIncludeStoryBible] = useState(false);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    // Trigger export API call
    toast({
      title: "Export Started",
      description: `Exporting ${projectTitle} as ${exportFormat.toUpperCase()}. This may take a moment.`,
    });
    
    // Simulate API call delay
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your export is ready for download.",
      });
      
      // Close the modal
      setOpen(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Choose what content to include in your export.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="export-format" className="text-sm font-medium mb-1 block">
              Export Format
            </Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                <SelectItem value="docx">Word Document (.docx)</SelectItem>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="html">HTML Document (.html)</SelectItem>
                <SelectItem value="epub">ePub Ebook (.epub)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-1 block">
              Export Content
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chapters"
                  checked={includeChapters}
                  onCheckedChange={(checked) => setIncludeChapters(!!checked)}
                />
                <Label htmlFor="chapters">Chapters</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="outline"
                  checked={includeOutline}
                  onCheckedChange={(checked) => setIncludeOutline(!!checked)}
                />
                <Label htmlFor="outline">Outline</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="storyboard"
                  checked={includeStoryboard}
                  onCheckedChange={(checked) => setIncludeStoryboard(!!checked)}
                />
                <Label htmlFor="storyboard">Storyboard notes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bible"
                  checked={includeStoryBible}
                  onCheckedChange={(checked) => setIncludeStoryBible(!!checked)}
                />
                <Label htmlFor="bible">Story Bible</Label>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-1 block">
              Options
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="page-numbers"
                  checked={includePageNumbers}
                  onCheckedChange={(checked) => setIncludePageNumbers(!!checked)}
                />
                <Label htmlFor="page-numbers">Include page numbers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toc"
                  checked={includeTableOfContents}
                  onCheckedChange={(checked) => setIncludeTableOfContents(!!checked)}
                />
                <Label htmlFor="toc">Include table of contents</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
