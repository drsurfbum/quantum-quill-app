import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type OutlineItem } from "@shared/schema";

// Define result types for better type safety
export type OutlineItemSuccess = {
  success: true;
  data: OutlineItem;
};

export type OutlineItemError = {
  success: false;
  error: unknown;
  projectId?: number;
  id?: number | string;
};

export type OutlineItemResult = OutlineItemSuccess | OutlineItemError;

// Special type for delete operation
export type DeleteOutlineItemSuccess = {
  success: true;
  data: {
    id: number | string;
    projectId: number | string;
    [key: string]: any;
  };
};

export type DeleteOutlineItemResult = DeleteOutlineItemSuccess | OutlineItemError;

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
  return useMutation<OutlineItemResult, Error, { 
    title: string, 
    content?: string, 
    projectId: number, 
    parentId: number | null,
    order: number,
    isCompleted?: boolean
  }>({
    mutationFn: async (data) => {
      try {
        const res = await apiRequest('POST', '/api/outline', data);
        const jsonData = await res.json();
        return { success: true, data: jsonData } as OutlineItemSuccess;
      } catch (error) {
        console.error("Error creating outline item:", error);
        return { success: false, error, projectId: data.projectId } as OutlineItemError;
      }
    },
    onSuccess: (result) => {
      if (!result.success) {
        console.error("Create operation was not successful:", result.error);
        return;
      }
      
      const data = result.data;
      
      // Use queryClient.setQueryData to update the cached items without triggering a full refetch
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Add the new item to the cached data
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], [...outlineItems, data]);
        
        // Cache the individual item data as well
        queryClient.setQueryData([`/api/outline/${data.id}`], data);
      } else {
        // Fall back to invalidation if we don't have the data cached
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
      }
    }
  });
};

// Update an outline item
export const useUpdateOutlineItem = () => {
  return useMutation<OutlineItemResult, Error, { 
    id: number | string,
    title?: string, 
    content?: string,
    parentId?: number | null,
    order?: number,
    isCompleted?: boolean
  }>({
    mutationFn: async ({ id, ...data }) => {
      try {
        const res = await apiRequest('PUT', `/api/outline/${id}`, data);
        const jsonData = await res.json();
        return { success: true, data: jsonData } as OutlineItemSuccess;
      } catch (error) {
        console.error("Error updating outline item:", error);
        return { success: false, error, id } as OutlineItemError;
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
  return useMutation<DeleteOutlineItemResult, Error, { id: number | string, projectId: number | string }>({
    mutationFn: async ({ id, projectId }) => {
      try {
        const res = await apiRequest('DELETE', `/api/outline/${id}`, undefined);
        // Handle non-success status codes
        if (!res.ok) {
          throw new Error(`Delete request failed with status ${res.status}`);
        }
        
        // 204 status means success with no content - no need to parse JSON
        return { 
          success: true, 
          data: { id, projectId } 
        } as DeleteOutlineItemSuccess;
      } catch (error) {
        // Only log and return an error for actual errors, not for success cases
        if (error instanceof Error) {
          console.error("Error deleting outline item:", error.message);
        } else {
          console.error("Unknown error deleting outline item");
        }
        throw error; // Let the onError handler deal with this
      }
    },
    onSuccess: (result) => {
      if (!result.success) {
        console.error("Delete operation was not successful:", result.error);
        return;
      }
      
      const data = result.data;
      
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
