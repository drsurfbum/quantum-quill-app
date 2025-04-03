import React, { useCallback, memo, useState, useEffect, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import PlotStructureView from './plot-structure-view';
import { queryClient } from '@/lib/queryClient';

/**
 * StablePlotStructureEditor
 * 
 * A memoized, context-aware plot structure editor component that:
 * 1. Resists unnecessary re-renders
 * 2. Uses application state context for stable source of truth
 * 3. Safely handles editor state changes without triggering re-renders elsewhere
 * 4. Prevents unwanted navigation during autosaving
 */
const StablePlotStructureEditor = memo(function StablePlotStructureEditor() {
  const { state, setPlotStructureId, setLastViewedPlotStructure } = useAppState();
  
  // Create a flag to prevent unwanted navigation
  const [isNavigationAllowed, setIsNavigationAllowed] = useState(false);
  
  // Create a ref to track if this is a manual close
  const isManualCloseRef = useRef(false);
  
  // Override the mutation cache to prevent navigation on save
  useEffect(() => {
    if (!state.plotStructureId) return;
    
    // Store the original method
    const originalInvalidate = queryClient.invalidateQueries;
    
    // Override the method to prevent query invalidation if it's coming from 
    // a plot structure section update while not in manual close mode
    queryClient.invalidateQueries = function(...args: any) {
      const isPlotSectionUpdate = 
        args[0]?.queryKey?.[0]?.toString().includes('plot-structure-sections') &&
        !isManualCloseRef.current;
        
      // If this is a plot structure update and not during manual close,
      // we don't invalidate which prevents navigation
      if (isPlotSectionUpdate) {
        console.log('Prevented automatic navigation after save');
        return Promise.resolve();
      }
      
      // Otherwise, proceed normally
      return originalInvalidate.apply(this, args);
    };
    
    // Restore original method on cleanup
    return () => {
      queryClient.invalidateQueries = originalInvalidate;
    };
  }, [state.plotStructureId]);
  
  // This function is the only way to safely navigate away from the editor
  const handleClose = useCallback(() => {
    // Mark this as a manual close action
    isManualCloseRef.current = true;
    setIsNavigationAllowed(true);
    
    // Cache the last viewed structure ID
    setLastViewedPlotStructure(state.plotStructureId);
    
    // Use setTimeout to ensure the state change has time to propagate
    setTimeout(() => {
      // Close the editor by setting ID to null
      setPlotStructureId(null);
      
      // Reset the flag after navigation
      isManualCloseRef.current = false;
    }, 50);
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