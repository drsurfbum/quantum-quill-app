import PlotStructureView from "./plot-structure-view";
export default function PlotStructureEditorWrapper({ structureId, onClose }: { structureId: number; onClose: () => void }) {
  return <PlotStructureView key={structureId} structureId={structureId} onClose={onClose} />;
}
