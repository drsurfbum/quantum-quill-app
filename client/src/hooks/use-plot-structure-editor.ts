import { useState, useCallback, useRef, useEffect } from 'react';
import { create } from 'zustand';

// Define the editor state store
interface PlotStructureEditorStore {
  isEditing: boolean;
  structureId: number | null;
  startEditing: (id: number) => void;
  stopEditing: () => void;
}

// Create a global store for editor state to prevent prop drilling
const usePlotStructureEditorStore = create<PlotStructureEditorStore>((set) => ({
  isEditing: false,
  structureId: null,
  startEditing: (id: number) => set({ isEditing: true, structureId: id }),
  stopEditing: () => set({ isEditing: false, structureId: null }),
}));

/**
 * Hook to manage plot structure editing state
 * Uses Zustand for global state to avoid prop drilling and prevent re-render issues
 */
export function usePlotStructureEditor() {
  const { 
    isEditing, 
    structureId,
    startEditing: startEditingAction, 
    stopEditing: stopEditingAction 
  } = usePlotStructureEditorStore();
  
  // Wrap with useCallback to ensure stable function references
  const startEditing = useCallback((id: number) => {
    startEditingAction(id);
  }, [startEditingAction]);
  
  const stopEditing = useCallback(() => {
    stopEditingAction();
  }, [stopEditingAction]);
  
  return {
    isEditing,
    editingStructureId: structureId,
    startEditing,
    stopEditing,
  };
}