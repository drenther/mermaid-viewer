import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { useSelector } from "@xstate/store/react";
import { diagramsStore } from "../stores/diagramsStore";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface DiagramLibraryDialogProps {
  onLoad: (code: string) => void;
  portalContainer?: HTMLElement;
}

export function DiagramLibraryDialog({ onLoad, portalContainer }: DiagramLibraryDialogProps) {
  const [open, setOpen] = useState(false);
  const diagrams = useSelector(diagramsStore, (s) => s.context.diagrams);

  const sorted = [...diagrams].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={<Dialog.Trigger />}
          className="icon-btn"
          aria-label="Saved diagrams"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </Tooltip.Trigger>
        <Tooltip.Portal container={portalContainer}>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className="tooltip-popup">Saved diagrams</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>

      <Dialog.Portal container={portalContainer}>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <Dialog.Title className="dialog-title">Saved Diagrams</Dialog.Title>

          {sorted.length === 0 ? (
            <p className="diagram-list-empty">No saved diagrams yet</p>
          ) : (
            <div className="diagram-list">
              {sorted.map((d) => (
                <div key={d.id} className="diagram-list-item">
                  <button
                    type="button"
                    className="diagram-list-item-main"
                    onClick={() => {
                      onLoad(d.code);
                      setOpen(false);
                    }}
                  >
                    <span className="diagram-list-item-name">{d.name}</span>
                    <span className="diagram-list-item-meta">
                      <span className="diagram-list-item-date">{formatDate(d.updatedAt)}</span>
                      <span className="diagram-list-item-preview">
                        {d.code.trim().split("\n")[0]?.slice(0, 50)}
                      </span>
                    </span>
                  </button>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      className="diagram-list-item-delete"
                      aria-label={`Delete "${d.name}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        diagramsStore.trigger.deleteDiagram({ id: d.id });
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Portal container={portalContainer}>
                      <Tooltip.Positioner sideOffset={6}>
                        <Tooltip.Popup className="tooltip-popup">Delete</Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              ))}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
