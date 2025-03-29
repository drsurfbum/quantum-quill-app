import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type StoryBibleEntry } from "@shared/schema";

// Get all story bible entries for a project
export const useStoryBibleEntries = (projectId: string | number) => {
  return useQuery<StoryBibleEntry[]>({
    queryKey: [`/api/projects/${projectId}/story-bible`],
    enabled: !!projectId
  });
};

// Get a single story bible entry
export const useStoryBibleEntry = (entryId: string | number) => {
  return useQuery<StoryBibleEntry>({
    queryKey: [`/api/story-bible/${entryId}`],
    enabled: !!entryId
  });
};

// Create a new story bible entry
export const useCreateStoryBibleEntry = () => {
  return useMutation({
    mutationFn: async (data: { 
      title: string, 
      content?: string, 
      projectId: number, 
      entryType: string 
    }) => {
      const res = await apiRequest('POST', '/api/story-bible', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/story-bible`] });
    }
  });
};

// Update a story bible entry
export const useUpdateStoryBibleEntry = () => {
  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: number | string,
      title?: string, 
      content?: string,
      entryType?: string
    }) => {
      const res = await apiRequest('PUT', `/api/story-bible/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/story-bible/${data.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/story-bible`] });
    }
  });
};

// Delete a story bible entry
export const useDeleteStoryBibleEntry = () => {
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number | string, projectId: number | string }) => {
      const res = await apiRequest('DELETE', `/api/story-bible/${id}`, undefined);
      return { id, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/story-bible`] });
    }
  });
};
