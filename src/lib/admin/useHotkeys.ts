import { useEffect } from "react";

/**
 * Optional keyboard accelerators for counter screens.
 *
 * Safety: plain single-character keys are ignored while the user is typing in
 * an input, textarea, select or contenteditable element, so entering an IMEI or
 * a price can never trigger a shortcut. Modifier and function keys work
 * everywhere. Handlers are responsible for their own duplicate-submit guards.
 */
export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true
  );
}

function candidates(event: KeyboardEvent): string[] {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const list: string[] = [];
  if (event.ctrlKey || event.metaKey) list.push(`mod+${key}`);
  if (event.shiftKey) list.push(`shift+${key}`);
  list.push(key);
  return list;
}

export function useHotkeys(map: HotkeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    function onKeyDown(event: KeyboardEvent) {
      for (const combo of candidates(event)) {
        const handler = map[combo];
        if (!handler) continue;
        const plainKey = !combo.includes("+") && combo.length === 1;
        if (plainKey && isTyping(event.target)) return;
        event.preventDefault();
        handler(event);
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [map, enabled]);
}
