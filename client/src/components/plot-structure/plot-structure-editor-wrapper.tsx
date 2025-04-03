import React, { useState, useCallback, useRef } from 'react';
import PlotStructureView from './plot-structure-view';

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
  
  // Create a persistent reference to the onClose function
  const onCloseRef = useRef(onClose);
  
  // Create a stable callback that won't change on re-renders
  const handleClose = useCallback(() => {
    if (onCloseRef.current) {
      onCloseRef.current();
    }
  }, []);
  
  return (
    <PlotStructureView
      structureId={internalStructureId}
      onClose={handleClose}
    />
  );
}