import { registerCustomTheme } from "@pierre/diffs"
import { KodineTheme } from "./marked-theme"

let registered = false

export function registerKodineTheme() {
  if (registered) return
  registered = true
  registerCustomTheme("Kodine", () => Promise.resolve(KodineTheme))
}
