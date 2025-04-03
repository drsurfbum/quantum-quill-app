import React, { useCallback, memo } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import PlotStructureView from './plot-structure-view';

/**
 * StablePlotStructureEditor
 * 
 * A memoized, context-aware plot structure editor component that:
 * 1. Resists unnecessary re-renders
 * 2. Uses application state context for stable source of truth
 * 3. Safely handles editor state changes without triggering re-renders elsewhere
 */
const StablePlotStructureEditor = memo(function StablePlotStructureEditor() {
  const { state, setPlotStructureId, setLastViewedPlotStructure } = useAppState();
  
  // Handle editor close with stable reference
  const handleClose = useCallback(() => {
    // Cache the last viewed structure ID
    setLastViewedPlotStructure(state.plotStructureId);
    
    // Close the editor by setting ID to null
    setPlotStructureId(null);
  }, [state.plotStructureId, setPlotStructureId, setLastViewedPlotStructure]);
  
  // If there's no active structure ID, don't render
  if (!state.plotStructureId) {
    return null;
  }
  
  return (
    <PlotStructureView 
      structureId={state.plotStructureId} 
      onClose={handleClose}
    />
  );
});

export default StablePlotStructureEditor;