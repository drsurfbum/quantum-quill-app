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
      order: number 
    }) => {
      const res = await apiRequest('POST', '/api/outline', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
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
      order?: number 
    }) => {
      const res = await apiRequest('PUT', `/api/outline/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/outline/${data.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
    }
  });
};

// Delete an outline item
export const useDeleteOutlineItem = () => {
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number | string, projectId: number | string }) => {
      const res = await apiRequest('DELETE', `/api/outline/${id}`, undefined);
      return { id, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/outline`] });
    }
  });
};
