import { useState, useCallback } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { diagramsStore } from "../stores/diagramsStore";

function deriveDefaultName(code: string): string {
  const firstLine = code.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return "Untitled Diagram";
  return firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine;
}

interface SaveDiagramDialogProps {
  code: string;
  portalContainer?: HTMLElement;
}

export function SaveDiagramDialog({ code, portalContainer }: SaveDiagramDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleOpen = useCallback(() => {
    setName(deriveDefaultName(code));
    setOpen(true);
  }, [code]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    diagramsStore.trigger.saveDiagram({ name: name.trim(), code });
    setOpen(false);
  }, [name, code]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={<Dialog.Trigger />}
          className="icon-btn"
          disabled={!code.trim()}
          aria-label="Save diagram"
          onClick={handleOpen}
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
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </Tooltip.Trigger>
        <Tooltip.Portal container={portalContainer}>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className="tooltip-popup">Save diagram</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>

      <Dialog.Portal container={portalContainer}>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <Dialog.Title className="dialog-title">Save Diagram</Dialog.Title>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <label className="save-label" htmlFor="diagram-name">
              Name
            </label>
            <input
              id="diagram-name"
              className="save-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Diagram name"
            />
            <div className="dialog-actions">
              <Dialog.Close className="dialog-btn dialog-btn-secondary">Cancel</Dialog.Close>
              <button
                type="submit"
                className="dialog-btn dialog-btn-primary"
                disabled={!name.trim()}
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
