document.addEventListener("caath:portal-assist-ping", (event) => {
  const requestId = event?.detail?.requestId;
  if (typeof requestId !== "string") return;
  chrome.runtime.sendMessage({ type: "CAATH_PORTAL_ASSIST_PING" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) return;
    document.dispatchEvent(new CustomEvent("caath:portal-assist-pong", {
      detail: { requestId, ok: true },
    }));
  });
});

document.addEventListener("caath:portal-autofill-request", (event) => {
  const detail = event?.detail;
  if (!detail || typeof detail.requestId !== "string") return;
  chrome.runtime.sendMessage({
    type: "CAATH_PORTAL_AUTOFILL",
    payload: detail,
  }, (response) => {
    document.dispatchEvent(new CustomEvent("caath:portal-autofill-status", {
      detail: {
        requestId: detail.requestId,
        ok: Boolean(response?.ok) && !chrome.runtime.lastError,
        error: response?.error || (chrome.runtime.lastError ? "CAATH Portal Assist is unavailable." : undefined),
      },
    }));
  });
});
