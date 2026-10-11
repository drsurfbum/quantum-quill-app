// Minimal DOM for mounted React regression tests; no browser or real server.
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const name of ["window", "document", "innerHeight", "innerWidth", "navigator", "HTMLElement", "Element", "Node", "DocumentFragment", "MutationObserver", "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "HTMLInputElement", "HTMLTextAreaElement"])
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
Object.assign(globalThis, { NodeFilter: dom.window.NodeFilter, getComputedStyle: dom.window.getComputedStyle, requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, IS_REACT_ACT_ENVIRONMENT: true });
export {};

// Text layout is outside these persistence tests.
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
