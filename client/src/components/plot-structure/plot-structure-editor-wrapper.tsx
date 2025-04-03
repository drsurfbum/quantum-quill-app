import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlotStructureView from './plot-structure-view';
import { queryClient } from '@/lib/queryClient';

interface PlotStructureEditorWrapperProps {
  structureId: number;
  onClose: () => void;
}

/**
 * This wrapper component maintains the structureId state across renders
 * to prevent the editor from closing when saving content.
 * 
 * It acts as a stable container that isn't affected by parent re-renders
 * or state changes from save operations.
 */
export default function PlotStructureEditorWrapper({ 
  structureId, 
  onClose 
}: PlotStructureEditorWrapperProps) {
  // Create a stable state that won't change with parent re-renders
  const [internalStructureId] = useState<number>(structureId);
  
  // Create a flag to prevent unwanted navigation
  const [isNavigationAllowed, setIsNavigationAllowed] = useState(false);
  
  // Create a persistent reference to the onClose function
  const onCloseRef = useRef(onClose);
  
  // Create a ref to track if this is a manual close
  const isManualCloseRef = useRef(false);
  
  // Update ref if onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  // Override the mutation cache to prevent navigation on save
  useEffect(() => {
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
  }, []);
  
  // This function is the only way to safely navigate away from the editor
  const safeClose = useCallback(() => {
    // Mark this as a manual close action
    isManualCloseRef.current = true;
    setIsNavigationAllowed(true);
    
    // Use setTimeout to ensure the state change has time to propagate
    setTimeout(() => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
      
      // Reset the flag after navigation
      isManualCloseRef.current = false;
    }, 50);
  }, []);
  
  return (
    <PlotStructureView
      structureId={internalStructureId}
      onClose={safeClose} // Use our controlled close function instead
    />
  );
}