import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { OutlineItem } from '@/contexts/outline-context';

// Type for creating a new outline item
interface CreateOutlineItemData {
  projectId: number;
  title: string;
  parentId: number | null;
}

// Type for updating an outline item
interface UpdateOutlineItemData {
  id: number;
  revision: number;
  title?: string;
  content?: string;
  isCompleted?: boolean;
}

// Type for deleting an outline item
interface DeleteOutlineItemData {
  id: number;
  projectId: number;
}

// API response type
interface ApiResponse {
  success: boolean;
  data?: OutlineItem;
}

// Hook for creating a new outline item
export function useCreateOutlineItem() {
  return useMutation({
    mutationFn: async (data: CreateOutlineItemData): Promise<OutlineItem> => {
      const response = await apiRequest('POST', '/api/outline', data);
      return await response.json();
    }
  });
}

// Hook for updating an outline item
export function useUpdateOutlineItem() {
  return useMutation({
    mutationFn: async (data: UpdateOutlineItemData): Promise<ApiResponse> => {
      try {
        const { id, revision, ...patch } = data;
        const response = await apiRequest('PUT', `/api/outline/${id}`, { ...patch, _revision: revision });
        
        if (!response.ok) {
          console.error('Update operation failed:', response.status, response.statusText);
          throw new Error(`Update failed: ${response.status} ${response.statusText}`);
        }
        
        return { success: true, data: await response.json() };
      } catch (error) {
        console.error('Error updating outline item:', error);
        return { success: false };
      }
    }
  });
}

// Hook for deleting an outline item
export function useDeleteOutlineItem() {
  return useMutation({
    mutationFn: async (data: DeleteOutlineItemData): Promise<ApiResponse> => {
      try {
        const response = await apiRequest('DELETE', `/api/outline/${data.id}`);
        
        if (!response.ok) {
          console.error('Delete operation failed:', response.status, response.statusText);
          throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Delete error:', error);
        return { success: false };
      }
    }
  });
}