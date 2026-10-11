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
        throw error;
      }
    },
    onSettled: (result) => {
      if (!result || !result.success) {
        console.error("Create operation was not successful:", result?.error);
        return;
      }
      
      const data = result.data;
      
      // Update the cached items directly to avoid multiple API calls
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Add the new item to the cached data
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], [...outlineItems, data]);
        
        // Cache the individual item data as well
        queryClient.setQueryData([`/api/outline/${data.id}`], data);
      }
      // Don't invalidate queries to prevent multiple API calls
    }
  });
};

// Update an outline item
export const useUpdateOutlineItem = () => {
  return useMutation<OutlineItemResult, Error, { 
    id: number | string,
    revision: number,
    title?: string, 
    content?: string,
    parentId?: number | null,
    order?: number,
    isCompleted?: boolean
  }>({
    mutationFn: async ({ id, revision, ...data }) => {
      try {
        const res = await apiRequest('PUT', `/api/outline/${id}`, { ...data, _revision: revision });
        const jsonData = await res.json();
        return { success: true, data: jsonData } as OutlineItemSuccess;
      } catch (error) {
        console.error("Error updating outline item:", error);
        throw error;
      }
    },
    onSettled: (result) => {
      if (!result || !result.success) {
        console.error("Update operation was not successful:", result?.error);
        return;
      }
      
      const data = result.data;
      
      // Update the cached item directly to prevent save failures
      const outlineItems = queryClient.getQueryData<OutlineItem[]>([`/api/projects/${data.projectId}/outline`]);
      
      if (outlineItems) {
        // Update the specific item without triggering a refetch
        const updatedItems = outlineItems.map(item => 
          item.id === data.id ? { ...item, ...data } : item
        );
        
        queryClient.setQueryData([`/api/projects/${data.projectId}/outline`], updatedItems);
        queryClient.setQueryData([`/api/outline/${data.id}`], data);
      }
      // Don't invalidate to prevent multiple API calls and save conflicts
    }
  });
};

// Delete an outline item
export const useDeleteOutlineItem = () => {
  return useMutation<DeleteOutlineItemResult, Error, { id: number | string, projectId: number | string }>({
    mutationFn: async ({ id, projectId }) => {
      await apiRequest("DELETE", `/api/outline/${id}`);
      return { success: true, data: { id, projectId } } as DeleteOutlineItemSuccess;
    },
    onSuccess: (result) => {
      if (!result.success) return;
      const { id, projectId } = result.data;
      queryClient.setQueryData([`/api/projects/${projectId}/outline`], (old: OutlineItem[] | undefined) =>
        old?.filter(item => item.id !== Number(id)));
      queryClient.removeQueries({ queryKey: [`/api/outline/${id}`] });
    }
  });
};
