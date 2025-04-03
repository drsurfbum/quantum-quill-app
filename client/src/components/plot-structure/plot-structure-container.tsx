import React from 'react';
import PlotStructureManager from './plot-structure-manager';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface PlotStructureContainerProps {
  projectId: string | number;
}

export default function PlotStructureContainer({ projectId }: PlotStructureContainerProps) {
  return (
    <div className="flex-grow flex overflow-hidden">
      <div className="w-full h-full">
        <PlotStructureManager projectId={projectId} />
      </div>
    </div>
  );
}