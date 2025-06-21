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
      const result = await res.json();
      
      // Invalidate cache after successful creation
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/story-bible`] });
      
      return { success: true, data: result };
    }
  });
};

// Update a story bible entry
export const useUpdateStoryBibleEntry = (options?: { skipInvalidation?: boolean }) => {
  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: number | string,
      title?: string, 
      content?: string,
      entryType?: string,
      category?: string | null,
      subcategory?: string | null,
      tags?: string[] | null,
      relatedEntryIds?: number[] | null,
      metadata?: any,
      isArchived?: boolean,
      priority?: number
    }) => {
      const res = await apiRequest('PUT', `/api/story-bible/${id}`, data);
      const result = await res.json();
      
      // Only update cache if skipInvalidation is not set
      if (!options?.skipInvalidation) {
        // Silent cache update after successful save
        queryClient.setQueryData([`/api/story-bible/${id}`], result);
        queryClient.setQueryData([`/api/projects/${result.projectId}/story-bible`], (old: StoryBibleEntry[] | undefined) => {
          if (!old) return [result];
          return old.map(entry => entry.id === result.id ? result : entry);
        });
      }
      
      return result;
    }
  });
};

// Delete a story bible entry
export const useDeleteStoryBibleEntry = () => {
  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await apiRequest('DELETE', `/api/story-bible/${id}`, undefined);
      
      return { id };
    }
  });
};
