import React, { memo } from 'react';
import PlotStructureManager from './plot-structure-manager';

interface PlotStructureContainerProps {
  projectId: string | number;
}

/**
 * PlotStructureContainer
 * A memoized container component that prevents unnecessary re-renders
 * of the Plot Structure management interface.
 */
const PlotStructureContainer = memo(function PlotStructureContainer({ 
  projectId 
}: PlotStructureContainerProps) {
  // Convert any string ID to number
  const numericProjectId = typeof projectId === 'string' 
    ? parseInt(projectId) 
    : projectId;
    
  return (
    <div className="flex-grow flex overflow-hidden">
      <div className="w-full h-full">
        <PlotStructureManager projectId={numericProjectId} />
      </div>
    </div>
  );
});

export default PlotStructureContainer;