const themeButton = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector("#theme-label");
const modes = ["system", "light", "dark"];
const labels = document.documentElement.lang.startsWith("en")
  ? { system: "System", light: "Light", dark: "Dark" }
  : { system: "Sistem", light: "Terang", dark: "Gelap" };
const themeStorageKey = "cv-ats-generator:theme";
let mode = "system";

try {
  const saved = localStorage.getItem(themeStorageKey);
  if (modes.includes(saved)) mode = saved;
} catch {
  // The landing page remains usable when browser storage is unavailable.
}

function applyTheme() {
  if (mode === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = mode;
  if (!themeButton || !themeLabel) return;
  themeLabel.textContent = labels[mode];
  const prefix = document.documentElement.lang.startsWith("en") ? "Theme" : "Tema";
  const hint = document.documentElement.lang.startsWith("en") ? "Click to change." : "Klik untuk mengganti.";
  themeButton.setAttribute("aria-label", `${prefix}: ${labels[mode]}. ${hint}`);
}

themeButton?.addEventListener("click", () => {
  mode = modes[(modes.indexOf(mode) + 1) % modes.length];
  try {
    if (mode === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, mode);
  } catch {
    // Theme switching remains available for this page view.
  }
  applyTheme();
});

const phoneViewButtons = [...document.querySelectorAll("[data-phone-view]")];
const phonePanels = [...document.querySelectorAll("[data-phone-panel]")];

function setPhoneView(view) {
  phoneViewButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.phoneView === view));
  });
  phonePanels.forEach((panel) => {
    const active = panel.dataset.phonePanel === view;
    panel.classList.toggle("is-active", active);
    panel.setAttribute("aria-hidden", String(!active));
  });
}

phoneViewButtons.forEach((button) => {
  button.addEventListener("click", () => setPhoneView(button.dataset.phoneView));
});

applyTheme();


const typingRoot = document.querySelector("[data-typing]");
const typingMeasure = typingRoot?.querySelector("[data-typing-measure]");
const typingLive = typingRoot?.querySelector("[data-typing-live]");
const reduceTypingMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

if (typingRoot && typingMeasure && typingLive && !reduceTypingMotion) {
  const typingValue = typingMeasure.textContent.trim();
  const TYPE_DELAY = 55;
  const DELETE_DELAY = 32;
  const FULL_TEXT_PAUSE = 1600;
  const EMPTY_TEXT_PAUSE = 450;
  let typingIndex = 0;
  let typingDeleting = false;
  typingLive.textContent = "";
  typingRoot.classList.add("is-typing");

  const updateTyping = () => {
    typingIndex += typingDeleting ? -1 : 1;
    typingLive.textContent = typingValue.slice(0, typingIndex);

    if (!typingDeleting && typingIndex === typingValue.length) {
      typingDeleting = true;
      window.setTimeout(updateTyping, FULL_TEXT_PAUSE);
      return;
    }

    if (typingDeleting && typingIndex === 0) {
      typingDeleting = false;
      window.setTimeout(updateTyping, EMPTY_TEXT_PAUSE);
      return;
    }

    window.setTimeout(updateTyping, typingDeleting ? DELETE_DELAY : TYPE_DELAY);
  };

  if (typingValue) window.setTimeout(updateTyping, 600);
}