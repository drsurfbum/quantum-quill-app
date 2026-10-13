import { currentAccount } from "@/lib/queryClient";
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  projectId?: number;
  imageUrl?: string;
  imageDescription?: string;
  onImageChange: (url: string, description?: string) => void;
  onRemoveImage: () => void;
  title?: string;
  placeholder?: string;
}

export function FileUpload({ projectId,
  imageUrl, 
  imageDescription, 
  onImageChange, 
  onRemoveImage,
  title = "Image",
  placeholder = "Add image"
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const description = imageDescription || '';
  const latest = useRef({ onImageChange, description });
  latest.current = { onImageChange, description };
  const upload = useRef<AbortController | null>(null);
  useEffect(() => () => { upload.current?.abort(); }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    upload.current?.abort();
    const controller = new AbortController();
    upload.current = controller;
    setIsUploading(true);

    try {
      const account = currentAccount();
      const uploadProject = projectId || window.location.pathname.match(/\/project\/(\d+)/)?.[1];
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { ...(account ? { 'X-QQ-Account': String(account) } : {}), ...(uploadProject ? { 'X-QQ-Project': String(uploadProject) } : {}) },
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      const data = await response.json();


      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || data.details || 'Upload failed');
      }
      if (controller.signal.aborted || currentAccount() !== account) return;
      latest.current.onImageChange(data.url, latest.current.description);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (!controller.signal.aborted) setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = e.currentTarget.value;
      if (url.trim()) {
        e.preventDefault();
        onImageChange(url.trim(), description);
        e.currentTarget.value = '';
      }
    }
  };

  const handleDescriptionChange = (newDescription: string) => {
    if (imageUrl) {
      onImageChange(imageUrl, newDescription);
    }
  };

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="space-y-2">
          <img 
            src={imageUrl} 
            alt={description || title}
            className="w-full h-48 object-cover rounded-md"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRemoveImage}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Remove Image
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-6 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">{placeholder}</p>
            
            {/* File Upload Button */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Upload image file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              
              <div className="text-xs text-muted-foreground">
                or
              </div>
            </div>
          </div>
          
          {/* URL Input */}
          <Input
            placeholder="Paste image URL..."
            onKeyDown={handleUrlInput}
            disabled={isUploading}
          />
        </div>
      )}
      
      {imageUrl && (
        <div>
          <Label htmlFor="imageDescription">Image Description</Label>
          <Input
            id="imageDescription"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe the image..."
          />
        </div>
      )}
    </div>
  );
}