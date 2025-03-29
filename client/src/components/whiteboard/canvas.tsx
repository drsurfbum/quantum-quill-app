import { useRef, useImperativeHandle, useEffect, forwardRef } from 'react';
import * as fabricjs from 'fabric';

const Canvas = forwardRef((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabricjs.Canvas | null>(null);
  
  useEffect(() => {
    // Initialize canvas
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabricjs.Canvas(canvasRef.current, {
        backgroundColor: '#f8f9fa',
        width: window.innerWidth,
        height: window.innerHeight - 120, // Adjust for toolbar height
        isDrawingMode: false,
      });
      
      fabricCanvasRef.current = canvas;
      
      // Handle resize
      const handleResize = () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight - 120);
        canvas.renderAll();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
  }, []);
  
  // Expose canvas methods to parent component
  useImperativeHandle(ref, () => ({
    // Set active tool
    setTool: (tool: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Disable drawing mode initially
      canvas.isDrawingMode = false;
      
      // Enable different tools based on selection
      switch (tool) {
        case 'pen':
          canvas.isDrawingMode = true;
          break;
        case 'select':
          // Enable object selection
          canvas.selection = true;
          break;
        case 'move':
          // Enable canvas panning
          canvas.selection = false;
          break;
        case 'text':
          // Add text on click
          const addText = () => {
            const text = new fabricjs.IText('Click to edit', {
              left: 50,
              top: 50,
              fontFamily: 'Inter',
              fill: canvas.freeDrawingBrush?.color || '#000',
              fontSize: 20,
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            canvas.off('mouse:down', addText);
          };
          canvas.on('mouse:down', addText);
          break;
        case 'rectangle':
          // Add rectangle on click
          const addRect = () => {
            const rect = new fabricjs.Rect({
              left: 50,
              top: 50,
              width: 100,
              height: 100,
              fill: 'transparent',
              stroke: canvas.freeDrawingBrush?.color || '#000',
              strokeWidth: canvas.freeDrawingBrush?.width || 2,
            });
            canvas.add(rect);
            canvas.setActiveObject(rect);
            canvas.off('mouse:down', addRect);
          };
          canvas.on('mouse:down', addRect);
          break;
        case 'circle':
          // Add circle on click
          const addCircle = () => {
            const circle = new fabricjs.Circle({
              left: 50,
              top: 50,
              radius: 50,
              fill: 'transparent',
              stroke: canvas.freeDrawingBrush?.color || '#000',
              strokeWidth: canvas.freeDrawingBrush?.width || 2,
            });
            canvas.add(circle);
            canvas.setActiveObject(circle);
            canvas.off('mouse:down', addCircle);
          };
          canvas.on('mouse:down', addCircle);
          break;
        case 'note':
          // Add sticky note on click
          const addNote = () => {
            const noteColor = '#fff8c4'; // Light yellow
            
            const rect = new fabricjs.Rect({
              left: 50,
              top: 50,
              width: 150,
              height: 150,
              fill: noteColor,
              stroke: '#e6d875',
              strokeWidth: 1,
              rx: 5,
              ry: 5,
              shadow: new fabricjs.Shadow({color: 'rgba(0,0,0,0.2)', blur: 5, offsetX: 2, offsetY: 2})
            });
            
            const text = new fabricjs.IText('Sticky Note', {
              left: 75,
              top: 75,
              fontFamily: 'Inter',
              fill: '#333',
              fontSize: 16,
            });
            
            const group = new fabricjs.Group([rect, text], {
              left: 50,
              top: 50,
            });
            
            canvas.add(group);
            canvas.setActiveObject(group);
            canvas.off('mouse:down', addNote);
          };
          canvas.on('mouse:down', addNote);
          break;
      }
      
      canvas.renderAll();
    },
    
    // Set brush color
    setColor: (color: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
      }
      
      // Also update selected objects
      const activeObjects = canvas.getActiveObjects();
      activeObjects.forEach((obj: any) => {
        if (obj.type === 'i-text') {
          obj.set('fill', color);
        } else {
          obj.set('stroke', color);
        }
      });
      
      canvas.renderAll();
    },
    
    // Set brush size
    setBrushSize: (size: number) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = size;
      }
      
      // Also update selected objects
      const activeObjects = canvas.getActiveObjects();
      activeObjects.forEach((obj: any) => {
        if (obj.type !== 'i-text') {
          obj.set('strokeWidth', size);
        }
      });
      
      canvas.renderAll();
    },
    
    // Undo last action
    undo: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Simple undo implementation would require maintaining history
      console.log("Undo functionality would be implemented here");
    },
    
    // Redo last undone action
    redo: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Simple redo implementation would require maintaining history
      console.log("Redo functionality would be implemented here");
    },
    
    // Clear canvas
    clear: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      canvas.clear();
      canvas.backgroundColor = '#f8f9fa';
      canvas.renderAll();
    },
    
    // Save canvas state
    save: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return null;
      
      return JSON.stringify(canvas.toJSON());
    },
    
    // Load canvas state
    load: (data: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      try {
        canvas.loadFromJSON(data, () => {
          canvas.renderAll();
        });
      } catch (error) {
        console.error("Error loading canvas data:", error);
      }
    },
    
    // Export canvas as image
    export: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataURL;
      link.click();
    },
    
    // Add image to canvas
    addImage: (url: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      fabricjs.Image.fromURL(url, (img: any) => {
        // Scale down large images
        if (img.width && img.width > 500) {
          const scale = 500 / img.width;
          img.scale(scale);
        }
        
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    }
  }));

  return (
    <canvas ref={canvasRef} />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
