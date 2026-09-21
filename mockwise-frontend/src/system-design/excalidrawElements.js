/**
 * Catalog of Excalidraw element / tool types exposed in the official editor.
 * We embed @excalidraw/excalidraw so users get the full set — not a subset clone.
 *
 * Official tools / element kinds (Excalidraw library):
 * @see https://docs.excalidraw.com/
 */
export const EXCALIDRAW_ELEMENT_CATALOG = [
  { id: 'selection', label: 'Selection', description: 'Select, move, and resize elements' },
  { id: 'rectangle', label: 'Rectangle', description: 'Boxes for services, stores, clients' },
  { id: 'diamond', label: 'Diamond', description: 'Decisions / gateways' },
  { id: 'ellipse', label: 'Ellipse', description: 'Nodes, users, regions' },
  { id: 'arrow', label: 'Arrow', description: 'Directed flows and dependencies' },
  { id: 'line', label: 'Line', description: 'Undirected connectors' },
  { id: 'freedraw', label: 'Freedraw', description: 'Freehand sketching' },
  { id: 'text', label: 'Text', description: 'Labels, notes, API names' },
  { id: 'image', label: 'Image', description: 'Embed screenshots or icons' },
  { id: 'frame', label: 'Frame', description: 'Group regions of the diagram' },
  { id: 'embeddable', label: 'Embeddable', description: 'Embed external content when enabled' },
  { id: 'eraser', label: 'Eraser', description: 'Remove strokes and shapes' },
  { id: 'laser', label: 'Laser pointer', description: 'Present without changing the diagram' },
];

/** Base key for local diagrams; each question gets its own scene. */
export const SYSTEM_DESIGN_STORAGE_PREFIX = 'mockwise_system_design_scene_v1';

/** @deprecated use getSystemDesignStorageKey(questionId) — kept for migration/clear-all */
export const SYSTEM_DESIGN_STORAGE_KEY = SYSTEM_DESIGN_STORAGE_PREFIX;

export const DEFAULT_DURATION_MINUTES = 45;

/**
 * Per-question whiteboard persistence (browser-local only).
 * Coding mocks keep code per index; we keep diagrams per design prompt id.
 */
export function getSystemDesignStorageKey(questionId) {
  const id = questionId || 'default';
  return `${SYSTEM_DESIGN_STORAGE_PREFIX}__${id}`;
}

export function clearSystemDesignScene(questionId) {
  try {
    localStorage.removeItem(getSystemDesignStorageKey(questionId));
  } catch {
    /* ignore */
  }
}
