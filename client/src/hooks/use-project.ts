import { getSaveQueue } from "@/hooks/use-autosave";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Project, type Chapter } from "@shared/schema";

// Get project by ID
export const useProject = (id: string | number) => {
  return useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id
  });
};

// Get project chapters
export const useProjectChapters = (projectId: string | number | undefined) => {
  return useQuery<Chapter[]>({
    queryKey: [`/api/projects/${projectId}/chapters`],
    enabled: !!projectId
  });
};

// Create new project
export const useCreateProject = () => {
  return useMutation({
    mutationFn: async (data: { title: string, description?: string }) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });
};

// Update project
export const useUpdateProject = () => {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number | string } & Partial<Project>) => {
      const res = await apiRequest('PUT', `/api/projects/${id}`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${variables.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });
};

// Create chapter
export const useCreateChapter = () => {
  return useMutation({
    mutationFn: async (data: { title: string, projectId: number, order: number, writingMode?: "chapter" | "scenes", isDraft?: boolean }) => {
      const res = await apiRequest('POST', '/api/chapters', data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${variables.projectId}/chapters`] });
    }
  });
};

// Update chapter
export const useUpdateChapter = () => {
  return useMutation({
    mutationFn: async ({ id, revision, ...data }: { id: number | string; revision: number } & Partial<Chapter>) => {
      const cached = queryClient.getQueryData<Chapter>([`/api/chapters/${id}`]);
      const projectId = cached?.projectId || queryClient.getQueriesData<Chapter[]>({predicate:q=>/^\/api\/projects\/\d+\/chapters$/.test(String(q.queryKey[0]))}).flatMap(([,rows])=>rows || []).find(ch=>String(ch.id)===String(id))?.projectId;
      const queue = getSaveQueue(`/api/chapters/${id}`,projectId ? `/api/projects/${projectId}/chapters` : undefined);
      queue.enqueue(data);
      if (!await queue.flush()) throw queue.error || new Error("Chapter changes are kept in draft recovery.");
      return queryClient.getQueryData<Chapter>([`/api/chapters/${id}`])!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${data.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/chapters`] });
    }
  });
};

// Delete chapter
export const useDeleteChapter = () => {
  return useMutation({
    mutationFn: async ({ id, projectId, revision }: { id: number | string, projectId: number | string, revision: number }) => {
      const res = await apiRequest('DELETE', `/api/chapters/${id}`, {_revision: revision});
      return { success: res.ok, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${result.projectId}/chapters`] });
    }
  });
};
