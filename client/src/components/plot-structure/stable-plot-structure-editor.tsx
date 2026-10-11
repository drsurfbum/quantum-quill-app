import { useAppState } from "@/contexts/app-state-context";
import PlotStructureView from "./plot-structure-view";
export default function StablePlotStructureEditor() {
  const { state, setPlotStructureId, setLastViewedPlotStructure } = useAppState();
  if (!state.plotStructureId) return null;
  return <PlotStructureView key={state.plotStructureId} structureId={state.plotStructureId} onClose={() => {
    setLastViewedPlotStructure(state.plotStructureId);
    setPlotStructureId(null);
  }} />;
}
