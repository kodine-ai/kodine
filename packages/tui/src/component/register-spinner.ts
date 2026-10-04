import { getComponentCatalogue } from "@opentui/solid/components"
import { registerSpinner } from "opentui-spinner/solid"

export function registerKodineSpinner() {
  if (!getComponentCatalogue().spinner) registerSpinner()
}
