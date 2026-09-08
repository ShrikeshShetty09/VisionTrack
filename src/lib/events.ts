export function triggerActionUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("visiontrack:action"));
  }
}
