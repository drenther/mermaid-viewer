import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const visible = offlineReady || needRefresh;

  if (!visible) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="pwa-toast" role="alert">
      <span className="pwa-toast-message">
        {needRefresh ? "Update available" : "App ready to work offline"}
      </span>
      <div className="pwa-toast-actions">
        {needRefresh && (
          <button className="pwa-toast-reload" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
        )}
        <button className="pwa-toast-close" onClick={close} aria-label="Dismiss">
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
