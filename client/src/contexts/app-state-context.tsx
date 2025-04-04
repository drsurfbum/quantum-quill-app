import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of our application state
interface AppState {
  // Navigation state
  currentView: string;
  currentProjectId: number | null;
  
  // Editor states
  plotStructureId: number | null;
  outlineId: number | null;
  storyBibleId: number | null;
  
  // Modal states
  isCreateProjectModalOpen: boolean;
  isCreatePlotStructureModalOpen: boolean;
  
  // Cache of last viewed items to prevent re-fetching
  lastViewedPlotStructure: number | null;
  
  // UI state persistence
  expandedOutlineItems: Record<number, boolean>;
}

// Define the shape of our context
interface AppStateContextType {
  state: AppState;
  
  // Navigation actions
  setCurrentView: (view: string) => void;
  setCurrentProjectId: (id: number | null) => void;
  
  // Editor actions
  setPlotStructureId: (id: number | null) => void;
  setOutlineId: (id: number | null) => void;
  setStoryBibleId: (id: number | null) => void;
  
  // Modal actions
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openCreatePlotStructureModal: () => void;
  closeCreatePlotStructureModal: () => void;
  
  // Helpers
  setLastViewedPlotStructure: (id: number | null) => void;
  
  // UI state persistence
  setOutlineItemExpanded: (itemId: number, isExpanded: boolean) => void;
  isOutlineItemExpanded: (itemId: number) => boolean;
}

// Create the context with a default value
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Initial state
const initialState: AppState = {
  currentView: 'dashboard',
  currentProjectId: null,
  plotStructureId: null,
  outlineId: null,
  storyBibleId: null,
  isCreateProjectModalOpen: false,
  isCreatePlotStructureModalOpen: false,
  lastViewedPlotStructure: null,
  expandedOutlineItems: {},
};

// Provider component
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  
  // Navigation actions
  const setCurrentView = (view: string) => {
    setState(prev => ({ ...prev, currentView: view }));
  };
  
  const setCurrentProjectId = (id: number | null) => {
    setState(prev => ({ ...prev, currentProjectId: id }));
  };
  
  // Editor actions
  const setPlotStructureId = (id: number | null) => {
    setState(prev => ({ ...prev, plotStructureId: id }));
  };
  
  const setOutlineId = (id: number | null) => {
    setState(prev => ({ ...prev, outlineId: id }));
  };
  
  const setStoryBibleId = (id: number | null) => {
    setState(prev => ({ ...prev, storyBibleId: id }));
  };
  
  // Modal actions
  const openCreateProjectModal = () => {
    setState(prev => ({ ...prev, isCreateProjectModalOpen: true }));
  };
  
  const closeCreateProjectModal = () => {
    setState(prev => ({ ...prev, isCreateProjectModalOpen: false }));
  };
  
  const openCreatePlotStructureModal = () => {
    setState(prev => ({ ...prev, isCreatePlotStructureModalOpen: true }));
  };
  
  const closeCreatePlotStructureModal = () => {
    setState(prev => ({ ...prev, isCreatePlotStructureModalOpen: false }));
  };
  
  // Helper actions
  const setLastViewedPlotStructure = (id: number | null) => {
    setState(prev => ({ ...prev, lastViewedPlotStructure: id }));
  };
  
  // UI state persistence
  const setOutlineItemExpanded = (itemId: number, isExpanded: boolean) => {
    setState(prev => ({
      ...prev,
      expandedOutlineItems: {
        ...prev.expandedOutlineItems,
        [itemId]: isExpanded
      }
    }));
  };
  
  const isOutlineItemExpanded = (itemId: number): boolean => {
    return !!state.expandedOutlineItems[itemId];
  };
  
  // Create the value object
  const value = {
    state,
    setCurrentView,
    setCurrentProjectId,
    setPlotStructureId,
    setOutlineId,
    setStoryBibleId,
    openCreateProjectModal,
    closeCreateProjectModal,
    openCreatePlotStructureModal,
    closeCreatePlotStructureModal,
    setLastViewedPlotStructure,
    setOutlineItemExpanded,
    isOutlineItemExpanded,
  };
  
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use the app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}