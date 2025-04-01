import { useRef, useState, useEffect } from 'react';
import Canvas from './canvas';
import { Button } from '@/components/ui/button';
import { 
  Pen, Type, Square, Circle, StickyNote, 
  Undo, Redo, Save, Download, Image as ImageIcon,
  Trash2, MousePointer, Move, FileSpreadsheet, 
  ChevronLeft, ChevronRight, ListTree
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlotStructureManager from '@/components/plot-structure/plot-structure-manager';

interface WhiteboardProps {
  projectId: string | number;
  whiteboardId?: string | number;
  initialData?: any;
  onSave?: (data: any) => void;
}

type Tool = 'select' | 'pen' | 'text' | 'rectangle' | 'circle' | 'note' | 'image' | 'move';

export default function Whiteboard({ projectId, whiteboardId, initialData, onSave }: WhiteboardProps) {
  const canvasRef = useRef<any>(null);
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState('2');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'plotStructures' | 'notes'>('plotStructures');
  
  const toggleSidebar = (tab: 'plotStructures' | 'notes') => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarTab(tab);
    }
  };

  const handleToolChange = (tool: Tool) => {
    setSelectedTool(tool);
    if (canvasRef.current) {
      canvasRef.current.setTool(tool);
    }
  };
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
    if (canvasRef.current) {
      canvasRef.current.setColor(e.target.value);
    }
  };
  
  const handleBrushSizeChange = (value: string) => {
    setBrushSize(value);
    if (canvasRef.current) {
      canvasRef.current.setBrushSize(parseInt(value));
    }
  };
  
  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };
  
  const handleRedo = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };
  
  const handleClear = () => {
    if (canvasRef.current) {
      if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
        canvasRef.current.clear();
      }
    }
  };
  
  const handleSave = () => {
    if (canvasRef.current) {
      const data = canvasRef.current.save();
      
      if (onSave) {
        onSave(data);
      } else {
        // API save
        const saveData = {
          id: whiteboardId,
          projectId,
          name: 'Main Storyboard',
          canvasData: data,
        };
        
        fetch(whiteboardId ? `/api/whiteboards/${whiteboardId}` : '/api/whiteboards', {
          method: whiteboardId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData),
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to save whiteboard');
            }
            return response.json();
          })
          .then(data => {
            toast({
              title: 'Whiteboard saved',
              description: 'Your whiteboard has been saved successfully.',
            });
          })
          .catch(error => {
            toast({
              title: 'Error saving whiteboard',
              description: error.message,
              variant: 'destructive',
            });
          });
      }
    }
  };
  
  const handleExport = () => {
    if (canvasRef.current) {
      canvasRef.current.exportImage();
    }
  };
  
  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file && canvasRef.current) {
        canvasRef.current.uploadImage(file);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (canvasRef.current && initialData) {
      canvasRef.current.load(initialData);
    }
  }, [initialData]);

  return (
    <div className="flex-grow flex overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 h-full flex flex-col overflow-hidden border-r">
          <div className="p-2 border-b flex justify-between items-center">
            <Tabs value={sidebarTab} onValueChange={(value: string) => setSidebarTab(value as any)}>
              <TabsList>
                <TabsTrigger value="plotStructures">
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Plot Structures</span>
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <ListTree className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Notes</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-grow overflow-hidden">
            {sidebarTab === 'plotStructures' && (
              <PlotStructureManager projectId={projectId} />
            )}
            {sidebarTab === 'notes' && (
              <div className="p-4">
                <h3 className="text-lg font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  This feature will be available soon.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-start items-center gap-1 bg-white dark:bg-neutral-900">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleSidebar('plotStructures')}
              title="Show plot structures"
              className="mr-1"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant={selectedTool === 'select' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('select')}
            title="Select tool"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'move' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('move')}
            title="Move canvas"
          >
            <Move className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'pen' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('pen')}
            title="Pen tool"
          >
            <Pen className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'text' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('text')}
            title="Text tool"
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'rectangle' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('rectangle')}
            title="Rectangle tool"
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'circle' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('circle')}
            title="Circle tool"
          >
            <Circle className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'note' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => handleToolChange('note')}
            title="Sticky note"
          >
            <StickyNote className="h-4 w-4" />
          </Button>
          
          <Button
            variant={selectedTool === 'image' ? 'default' : 'ghost'}
            size="icon"
            onClick={handleUploadImage}
            title="Upload image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              className="w-6 h-6 rounded-md border-0"
              title="Choose color"
            />
            
            <Select value={brushSize} onValueChange={handleBrushSizeChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Thin</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="4">Thick</SelectItem>
                <SelectItem value="8">Extra Thick</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="ml-auto flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              title="Clear canvas"
              className="text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title="Export as image"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              title="Save whiteboard"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        
        <div className="flex-grow relative bg-neutral-50 dark:bg-neutral-800 overflow-hidden">
          <Canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}