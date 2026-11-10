// Container for the Outline / Slides side panels.

import { useAppStore } from "../store";
import { OutlinePane } from "./OutlinePane";
import { SlidesPane } from "./SlidesPane";
import { Icon } from "./Icons";

export function SidePanel() {
  const panel = useAppStore((s) => s.sidePanel);
  const setSidePanel = useAppStore((s) => s.setSidePanel);
  if (!panel) return null;

  return (
    <div className="side-panel">
      <div className="side-panel-head">
        <Icon name={panel === "outline" ? "outline" : "slide"} size={14} />
        <span>{panel === "outline" ? "Outline" : "Slides"}</span>
        <span className="flex-spacer" />
        <button
          className="icon-btn icon-btn-sm"
          onClick={() => setSidePanel(null)}
          aria-label="Close panel"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
      {panel === "outline" ? <OutlinePane /> : <SlidesPane />}
    </div>
  );
}
