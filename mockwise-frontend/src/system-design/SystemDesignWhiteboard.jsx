import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EXCALIDRAW_ELEMENT_CATALOG,
  getSystemDesignStorageKey,
} from './excalidrawElements';
import '../styles/SystemDesign.css';

function loadScene(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildInitialData(scene) {
  if (scene && (scene.elements || scene.appState)) {
    return {
      elements: scene.elements || [],
      appState: {
        ...(scene.appState || {}),
        theme: 'dark',
        viewBackgroundColor: '#121212',
      },
      files: scene.files || undefined,
    };
  }
  return {
    appState: {
      theme: 'dark',
      viewBackgroundColor: '#121212',
    },
  };
}

/**
 * Lazy-loaded Excalidraw shell. Full official toolset.
 * `questionId` isolates localStorage + remounts the editor so boards never mix.
 */
function SystemDesignWhiteboard({ questionId }) {
  const storageKey = getSystemDesignStorageKey(questionId);
  const [Excalidraw, setExcalidraw] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [ready, setReady] = useState(false);

  // Load library once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import('@excalidraw/excalidraw/index.css');
        const mod = await import('@excalidraw/excalidraw');
        if (!cancelled) setExcalidraw(() => mod.Excalidraw);
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load whiteboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load this question's scene whenever questionId changes
  useEffect(() => {
    setReady(false);
    const scene = loadScene(storageKey);
    setInitialData(buildInitialData(scene));
    setReady(true);
  }, [storageKey, questionId]);

  const onChange = useCallback(
    (elements, appState, files) => {
      try {
        const payload = {
          questionId,
          elements,
          appState: {
            theme: 'dark',
            viewBackgroundColor: appState?.viewBackgroundColor || '#121212',
            gridSize: appState?.gridSize ?? null,
            zoom: appState?.zoom,
            scrollX: appState?.scrollX,
            scrollY: appState?.scrollY,
          },
          files: files || {},
          savedAt: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // quota / private mode
      }
    },
    [storageKey, questionId]
  );

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: { saveFileToDisk: true },
        loadScene: true,
        saveToActiveFile: false,
        toggleTheme: true,
        saveAsImage: true,
      },
      tools: {
        image: true,
      },
    }),
    []
  );

  if (loadError) {
    return (
      <div className="sd-whiteboard-error" role="alert">
        <p className="mb-2 fw-bold">Whiteboard failed to load</p>
        <p className="mb-0 small opacity-75">{loadError}</p>
      </div>
    );
  }

  if (!Excalidraw || !ready || !initialData) {
    return (
      <div className="sd-whiteboard-loading" role="status" aria-busy="true">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading whiteboard…</span>
        </div>
        <p className="mt-3 mb-0">Loading Excalidraw tools…</p>
        <p className="small opacity-75 mt-1">
          {EXCALIDRAW_ELEMENT_CATALOG.length} tool types available
        </p>
      </div>
    );
  }

  return (
    <div className="sd-excalidraw-host">
      {/* key forces a clean Excalidraw instance per question (isolated scene) */}
      <Excalidraw
        key={storageKey}
        theme="dark"
        initialData={initialData}
        onChange={onChange}
        uiOptions={uiOptions}
        name={`MockWise System Design — ${questionId || 'default'}`}
        langCode="en"
      />
    </div>
  );
}

export default SystemDesignWhiteboard;
