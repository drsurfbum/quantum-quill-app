import React, { useState, useEffect } from 'react';
import PlotStructureView from './plot-structure-view';

interface PlotStructureEditorWrapperProps {
  structureId: number;
  onClose: () => void;
}

/**
 * This wrapper component maintains the structureId state across renders
 * to prevent the editor from closing when saving content.
 */
export default function PlotStructureEditorWrapper({ 
  structureId, 
  onClose 
}: PlotStructureEditorWrapperProps) {
  // Initialize internal state with the provided structureId
  const [internalStructureId] = useState<number>(structureId);
  
  return (
    <PlotStructureView
      structureId={internalStructureId}
      onClose={onClose}
    />
  );
}