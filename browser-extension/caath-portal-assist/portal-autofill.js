const PORTAL_RULES = {
  GST: {
    hosts: ["gst.gov.in"],
    usernames: ["#username", "input[name='username']", "input[formcontrolname='username']", "input[placeholder*='username' i]"],
    passwords: ["#user_pass", "#password", "input[name='password']", "input[formcontrolname='password']", "input[type='password']"],
  },
  IncomeTax: {
    hosts: ["incometax.gov.in"],
    usernames: ["#panAdhaarUserId", "input[name='userId']", "input[formcontrolname='userId']", "input[placeholder*='user id' i]", "input[placeholder*='pan' i]"],
    passwords: ["#password", "input[name='password']", "input[formcontrolname='password']", "input[type='password']"],
  },
  MCA: {
    hosts: ["mca.gov.in"],
    usernames: ["#userName", "#username", "input[name='userName']", "input[name='username']", "input[placeholder*='user id' i]"],
    passwords: ["#password", "input[name='password']", "input[type='password']"],
  },
  TRACES: {
    hosts: ["tdscpc.gov.in"],
    usernames: ["#userId", "#username", "input[name='userId']", "input[name='username']"],
    passwords: ["#psw", "#password", "input[name='password']", "input[type='password']"],
  },
};

const portalTypeForPage = () => Object.entries(PORTAL_RULES).find(([, rule]) =>
  rule.hosts.some((host) => location.hostname === host || location.hostname.endsWith(`.${host}`)),
)?.[0];

const firstVisible = (selectors) => selectors
  .map((selector) => document.querySelector(selector))
  .find((element) => element instanceof HTMLInputElement && !element.disabled && element.offsetParent !== null);

const setInputValue = (element, value) => {
  if (!(element instanceof HTMLInputElement)) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return element.value === value;
};

const showStatus = (message) => {
  if (document.getElementById("caath-portal-assist-status")) return;
  const status = document.createElement("div");
  status.id = "caath-portal-assist-status";
  status.textContent = message;
  Object.assign(status.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    maxWidth: "360px",
    padding: "12px 16px",
    borderRadius: "8px",
    color: "#111827",
    background: "#f3cf63",
    border: "1px solid #c89b24",
    boxShadow: "0 12px 32px rgba(0,0,0,.28)",
    font: "600 14px/1.4 system-ui, sans-serif",
  });
  document.documentElement.appendChild(status);
  window.setTimeout(() => status.remove(), 12_000);
};

const tryAutofill = async () => {
  const portalType = portalTypeForPage();
  if (!portalType) return false;
  const key = `caath-pending-${portalType}`;
  const stored = await chrome.storage.session.get(key);
  const pending = stored[key];
  if (!pending) return false;
  if (Number(pending.expiresAt) <= Date.now()) {
    await chrome.storage.session.remove(key);
    return false;
  }

  const rule = PORTAL_RULES[portalType];
  const usernameInput = firstVisible(rule.usernames);
  const passwordInput = firstVisible(rule.passwords);
  const usernameFilled = usernameInput ? setInputValue(usernameInput, pending.username) : false;
  const passwordFilled = passwordInput ? setInputValue(passwordInput, pending.password) : false;

  if (usernameFilled || passwordFilled) {
    showStatus(passwordFilled
      ? "CAATH filled the login details. Complete CAPTCHA/OTP if shown, then click Login."
      : "CAATH filled the User ID. Continue on the portal; the password will be filled on the next step.");
  }
  if (passwordFilled) await chrome.storage.session.remove(key);
  return usernameFilled || passwordFilled;
};

void tryAutofill();
const observer = new MutationObserver(() => { void tryAutofill(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(() => observer.disconnect(), 60_000);
