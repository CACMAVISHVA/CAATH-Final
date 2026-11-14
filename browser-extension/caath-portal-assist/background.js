const ALLOWED_PORTALS = {
  GST: ["gst.gov.in"],
  IncomeTax: ["incometax.gov.in"],
  MCA: ["mca.gov.in"],
  TRACES: ["tdscpc.gov.in"],
};

const isCaathSender = (sender) => {
  try {
    const origin = new URL(sender.url || "").origin;
    return origin === "https://caath.in" || origin === "https://www.caath.in";
  } catch {
    return false;
  }
};

const validPortalUrl = (portalType, portalUrl) => {
  try {
    const parsed = new URL(portalUrl);
    if (parsed.protocol !== "https:") return false;
    return (ALLOWED_PORTALS[portalType] || []).some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CAATH_PORTAL_ASSIST_PING") {
    sendResponse({ ok: isCaathSender(sender) });
    return false;
  }

  if (message?.type === "CAATH_PORTAL_AUTOFILL") {
    if (!isCaathSender(sender)) {
      sendResponse({ ok: false, error: "Request was not sent by caath.in." });
      return false;
    }

    const payload = message.payload || {};
    if (
      !validPortalUrl(payload.portalType, payload.portalUrl)
      || typeof payload.username !== "string"
      || typeof payload.password !== "string"
      || !payload.username
      || !payload.password
      || Number(payload.expiresAt) <= Date.now()
    ) {
      sendResponse({ ok: false, error: "Invalid or expired portal login request." });
      return false;
    }

    const key = `caath-pending-${payload.portalType}`;
    chrome.storage.session.set({
      [key]: {
        portalType: payload.portalType,
        username: payload.username,
        password: payload.password,
        expiresAt: Math.min(Number(payload.expiresAt), Date.now() + 60_000),
      },
    }).then(() => chrome.tabs.create({ url: payload.portalUrl }))
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false, error: "Unable to open the official portal." }));
    return true;
  }

  return false;
});
