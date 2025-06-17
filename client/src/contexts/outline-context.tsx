import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface OutlineItem {
  id: number;
  projectId: number;
  title: string;
  content: string;
  parentId: number | null;
  order: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OutlineContextType {
  // Selection state
  selectedItemId: number | null;
  selectItem: (id: number | null) => void;
  
  // Expansion state
  expandedItems: Set<number>;
  toggleExpanded: (id: number) => void;
  setExpanded: (id: number, expanded: boolean) => void;
  isExpanded: (id: number) => boolean;
  
  // Cache related
  invalidateOutline: (projectId: number) => Promise<void>;
  
  // Item management
  getItemById: (id: number | null) => OutlineItem | undefined;
  getChildItems: (parentId: number | null) => OutlineItem[];
  getRootItems: () => OutlineItem[];
}

const OutlineContext = createContext<OutlineContextType | null>(null);

export function OutlineProvider({ children, projectId }: { children: ReactNode, projectId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for tree management
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  // Fetch outline items for this project
  const { data: outlineItems = [], isError } = useQuery<OutlineItem[]>({
    queryKey: [`/api/projects/${projectId}/outline`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/outline`);
      return await res.json();
    },
  });

  // Handle error state separately
  useEffect(() => {
    if (isError) {
      toast({
        title: 'Error loading outline',
        description: 'Failed to load outline items. Please try refreshing the page.',
        variant: 'destructive',
      });
    }
  }, [isError, toast]);
  
  // Helper to get all root items (items with no parent)
  const getRootItems = () => {
    return (outlineItems || []).filter((item: OutlineItem) => item.parentId === null)
      .sort((a: OutlineItem, b: OutlineItem) => a.order - b.order);
  };
  
  // Helper to get all child items of a specific parent
  const getChildItems = (parentId: number | null) => {
    return (outlineItems || []).filter((item: OutlineItem) => item.parentId === parentId)
      .sort((a: OutlineItem, b: OutlineItem) => a.order - b.order);
  };
  
  // Helper to get a specific item by ID
  const getItemById = (id: number | null) => {
    if (id === null) return undefined;
    return (outlineItems || []).find((item: OutlineItem) => item.id === id);
  };
  
  // When the project changes, reset selection
  useEffect(() => {
    setSelectedItemId(null);
    // Automatically expand root items on load
    const rootIds = new Set<number>();
    getRootItems().forEach(item => rootIds.add(item.id));
    setExpandedItems(rootIds);
  }, [projectId]);
  
  // Selection management
  const selectItem = (id: number | null) => {
    setSelectedItemId(id);
    
    // If selecting an item, ensure its parent chain is expanded
    if (id !== null) {
      const item = getItemById(id);
      if (item) {
        // Make sure the item itself is marked as expanded
        setExpanded(id, true);
        
        // Also expand all parent items in the chain
        let parentId = item.parentId;
        while (parentId !== null) {
          setExpanded(parentId, true);
          const parent = getItemById(parentId);
          parentId = parent?.parentId ?? null;
        }
      }
    }
  };
  
  // Expansion management
  const isExpanded = (id: number) => expandedItems.has(id);
  
  const setExpanded = (id: number, expanded: boolean) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (expanded) {
        newExpanded.add(id);
      } else {
        newExpanded.delete(id);
      }
      return newExpanded;
    });
  };
  
  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };
  
  // Cache invalidation function
  const invalidateOutline = async (projectId: number) => {
    await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outline`] });
  };
  
  return (
    <OutlineContext.Provider
      value={{
        selectedItemId,
        selectItem,
        expandedItems,
        toggleExpanded,
        setExpanded,
        isExpanded,
        invalidateOutline,
        getItemById,
        getChildItems,
        getRootItems,
      }}
    >
      {children}
    </OutlineContext.Provider>
  );
}

export function useOutline() {
  const context = useContext(OutlineContext);
  if (!context) {
    throw new Error('useOutline must be used within an OutlineProvider');
  }
  return context;
}