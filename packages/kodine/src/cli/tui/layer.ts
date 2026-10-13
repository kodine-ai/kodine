import { run as runTui, type TuiInput } from "@kodine-ai/tui"
import { Global } from "@kodine-ai/core/global"
import { AppNodeBuilder } from "@kodine-ai/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
