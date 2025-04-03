import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  PlotStructure, 
  PlotStructureTemplate, 
  PlotStructureSection, 
  InsertPlotStructure, 
  InsertPlotStructureSection
} from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Get all templates
export function usePlotTemplates() {
  return useQuery<PlotStructureTemplate[]>({
    queryKey: ['/api/plot-templates'],
  });
}

// Get a specific template
export function usePlotTemplate(id: number | null) {
  return useQuery<PlotStructureTemplate>({
    queryKey: [id ? `/api/plot-templates/${id}` : null],
    enabled: !!id
  });
}

// Get plot structures for a project
export function useProjectPlotStructures(projectId: number | string | null) {
  return useQuery<PlotStructure[]>({
    queryKey: [projectId ? `/api/projects/${projectId}/plot-structures` : null],
    enabled: !!projectId
  });
}

// Get a specific plot structure
export function usePlotStructure(id: number | null) {
  return useQuery<PlotStructure>({
    queryKey: [id ? `/api/plot-structures/${id}` : null],
    enabled: !!id
  });
}

// Get sections for a plot structure
export function usePlotStructureSections(structureId: number | null) {
  return useQuery<PlotStructureSection[]>({
    queryKey: [structureId ? `/api/plot-structures/${structureId}/sections` : null],
    enabled: !!structureId
  });
}

// Hook for plot structure actions
export function usePlotStructureActions() {
  const { toast } = useToast();

  // Create a new plot structure
  const createPlotStructureMutation = useMutation({
    mutationFn: async (data: InsertPlotStructure) => {
      const res = await apiRequest('POST', '/api/plot-structures', data);
      return await res.json() as PlotStructure;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${variables.projectId}/plot-structures`] });
      toast({
        title: 'Plot structure created',
        description: 'Your new plot structure has been created successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create plot structure',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update plot structure
  const updatePlotStructureMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<PlotStructure> }) => {
      const res = await apiRequest('PUT', `/api/plot-structures/${id}`, data);
      return await res.json() as PlotStructure;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/plot-structures/${variables.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/plot-structures`] });
      toast({
        title: 'Plot structure updated',
        description: 'Your plot structure has been updated successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update plot structure',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete plot structure
  const deletePlotStructureMutation = useMutation({
    mutationFn: async (id: number) => {
      const structure = await queryClient.getQueryData<PlotStructure>([`/api/plot-structures/${id}`]);
      await apiRequest('DELETE', `/api/plot-structures/${id}`);
      return structure;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/plot-structures`] });
        queryClient.removeQueries({ queryKey: [`/api/plot-structures/${data.id}`] });
      }
      toast({
        title: 'Plot structure deleted',
        description: 'Your plot structure has been deleted successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete plot structure',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Create section
  const createSectionMutation = useMutation({
    mutationFn: async (data: InsertPlotStructureSection) => {
      const res = await apiRequest('POST', '/api/plot-structure-sections', data);
      return await res.json() as PlotStructureSection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/plot-structures/${data.plotStructureId}/sections`] });
      toast({
        title: 'Section created',
        description: 'Your new section has been created successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create section',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update section
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<PlotStructureSection> }) => {
      const res = await apiRequest('PUT', `/api/plot-structure-sections/${id}`, data);
      return await res.json() as PlotStructureSection;
    },
    onSuccess: (data) => {
      // Instead of invalidating, we'll update the query cache directly to avoid re-fetching
      // This prevents the component from unmounting and remounting
      queryClient.setQueryData(
        [`/api/plot-structures/${data.plotStructureId}/sections`], 
        (oldData: PlotStructureSection[] | undefined) => {
          if (!oldData) return [data];
          return oldData.map(section => 
            section.id === data.id ? { ...section, ...data } : section
          );
        }
      );
      
      // Also update the individual section cache if it exists
      queryClient.setQueryData(
        [`/api/plot-structure-sections/${data.id}`], 
        (oldData: PlotStructureSection | undefined) => {
          if (!oldData) return data;
          return { ...oldData, ...data };
        }
      );
      
      // No toast here - let the component handle this for better UX
      // This prevents too many toast notifications from appearing during autosave
    },
    onError: (error) => {
      toast({
        title: 'Failed to update section',
        description: error.message,
        variant: 'destructive',
        duration: 3000 // Shorter duration
      });
    }
  });

  // Delete section
  const deleteSectionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/plot-structure-sections/${id}`);
    },
    onSuccess: () => {
      // We don't know which plot structure this section belonged to, so we can't selectively invalidate
      // Let's trust that the component calling this will handle invalidation
      toast({
        title: 'Section deleted',
        description: 'Your section has been deleted successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete section',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Helper function to create a plot structure from a template
  const createFromTemplate = async (projectId: number, template: PlotStructureTemplate) => {
    try {
      // Parse the template sections
      let sections: any[] = [];
      try {
        if (typeof template.sections === 'string') {
          sections = JSON.parse(template.sections) as any[];
        } else if (Array.isArray(template.sections)) {
          sections = template.sections;
        }
      } catch (error) {
        console.error('Error parsing template sections:', error);
        sections = [];
      }

      // Create the plot structure
      const structure = await createPlotStructureMutation.mutateAsync({
        projectId,
        templateId: template.id,
        name: template.name,
        description: template.description || ''
      });

      // Create sections for the structure
      for (const section of sections) {
        await createSectionMutation.mutateAsync({
          plotStructureId: structure.id,
          sectionKey: section.key,
          title: section.title,
          content: '',
          order: section.order
        });
      }

      return structure;
    } catch (error) {
      console.error('Error creating plot structure from template:', error);
      throw error;
    }
  };

  return {
    createPlotStructure: createPlotStructureMutation.mutate,
    updatePlotStructure: updatePlotStructureMutation.mutate,
    deletePlotStructure: deletePlotStructureMutation.mutate,
    createSection: createSectionMutation.mutate,
    updateSection: updateSectionMutation.mutate,
    deleteSection: deleteSectionMutation.mutate,
    createFromTemplate,
    // Provide loading states
    isLoading: 
      createPlotStructureMutation.isPending || 
      updatePlotStructureMutation.isPending || 
      deletePlotStructureMutation.isPending ||
      createSectionMutation.isPending ||
      updateSectionMutation.isPending ||
      deleteSectionMutation.isPending
  };
}