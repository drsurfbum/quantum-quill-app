import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type OutlineItem } from "@shared/schema";

// Get all outline items for a project
export const useOutlineItems = (projectId: string | number) => {
  return useQuery<OutlineItem[]>({
    queryKey: [`/api/projects/${projectId}/outline`],
    enabled: !!projectId
  });
};

// Get a single outline item
export const useOutlineItem = (itemId: string | number) => {
  return useQuery<OutlineItem>({
    queryKey: [`/api/outline/${itemId}`],
    enabled: !!itemId
  });
};

// Create a new outline item
export const useCreateOutlineItem = () => {
  return useMutation({
    mutationFn: async (data: { 
      title: string, 
      content?: string, 
      projectId: number, 
      parentId: number | null,
      order: number,
      isCompleted?: boolean
    }) => {
      const res = await apiRequest('POST', '/api/outline', data);
      return res.json();
    },
    onSuccess: (data) => {
      // Use queryClient.setQueryData to update the cached items without triggering a full refetch
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Add the new item to the cached data
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], [...outlineItems, data]);
      } else {
        // Fall back to invalidation if we don't have the data cached
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
      }
    }
  });
};

// Update an outline item
export const useUpdateOutlineItem = () => {
  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: number | string,
      title?: string, 
      content?: string,
      parentId?: number | null,
      order?: number,
      isCompleted?: boolean
    }) => {
      try {
        const res = await apiRequest('PUT', `/api/outline/${id}`, data);
        const jsonData = await res.json();
        return { success: true, data: jsonData };
      } catch (error) {
        console.error("Error updating outline item:", error);
        return { success: false, error, id };
      }
    },
    onSuccess: (result) => {
      if (!result.success) {
        console.error("Update operation was not successful:", result.error);
        return;
      }
      
      const data = result.data;
      
      // Use queryClient.setQueryData to update the cached item without triggering a full refetch
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Update the specific item without triggering a full refetch
        const updatedItems = outlineItems.map(item => 
          item.id === data.id ? { ...item, ...data } : item
        );
        
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], updatedItems);
        queryClient.setQueryData([`/api/outline/${data.id}`], data);
      } else {
        // Fall back to invalidation only if we don't have the data cached
        queryClient.invalidateQueries({ queryKey: [`/api/outline/${data.id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
      }
    }
  });
};

// Delete an outline item
export const useDeleteOutlineItem = () => {
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number | string, projectId: number | string }) => {
      try {
        const res = await apiRequest('DELETE', `/api/outline/${id}`, undefined);
        return { id, projectId, success: true };
      } catch (error) {
        console.error("Error deleting outline item:", error);
        return { id, projectId, success: false, error };
      }
    },
    onSuccess: (data) => {
      if (!data.success) {
        console.error("Delete operation was not successful:", data.error);
        return;
      }
      
      // Update the cache directly without triggering a refetch
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Remove the deleted item and all its children
        const deletedItemIds = new Set<number | string>();
        
        // Find the item and all its children
        const findItemsToDelete = (parentId: number | string) => {
          outlineItems.forEach(item => {
            if (item.id === parentId || item.parentId === parentId) {
              deletedItemIds.add(item.id);
              // Recursively find children's children
              findItemsToDelete(item.id);
            }
          });
        };
        
        findItemsToDelete(data.id);
        
        // Filter out the deleted items
        const filteredItems = outlineItems.filter(item => !deletedItemIds.has(item.id));
        
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], filteredItems);
      } else {
        // Fall back to invalidation if we don't have the data cached
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
      }
    }
  });
};
