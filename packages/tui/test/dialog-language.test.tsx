/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { testRender, useRenderer } from "@opentui/solid"
import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { onCleanup } from "solid-js"
import { tmpdir } from "./fixture/fixture"
import { createTuiResolvedConfig } from "./fixture/tui-runtime"
import { TestTuiContexts } from "./fixture/tui-environment"

async function wait(fn: () => boolean, timeout = 2000) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error("timed out waiting for condition")
    await Bun.sleep(10)
  }
}

async function mountLanguage(input: { root: string; onSelect: (value: string) => void }) {
  const state = path.join(input.root, "state")
  await mkdir(state, { recursive: true })
  await Bun.write(path.join(state, "kv.json"), "{}")

  const [
    { DialogProvider },
    { DialogLanguage },
    { KVProvider },
    { ThemeProvider },
    { TuiConfigProvider },
    { ToastProvider },
    { KodineKeymapProvider, registerKodineKeymap },
  ] = await Promise.all([
    import("../src/ui/dialog"),
    import("../src/ui/dialog-language"),
    import("../src/context/kv"),
    import("../src/context/theme"),
    import("../src/config"),
    import("../src/ui/toast"),
    import("../src/keymap"),
  ])

  const registrations: { keys: string[]; priority: number }[] = []

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const rawRegister = keymap.registerLayer.bind(keymap)
    keymap.registerLayer = (layer: any) => {
      registrations.push({ keys: (layer.bindings ?? []).map((b: any) => b.key), priority: layer.priority ?? 0 })
      return rawRegister(layer)
    }
    const resolvedConfig = createTuiResolvedConfig({ leader_timeout: 1000 })
    const off = registerKodineKeymap(keymap, renderer, resolvedConfig)
    onCleanup(off)

    return (
      <TestTuiContexts
        directory={input.root}
        paths={{
          home: input.root,
          state,
          worktree: input.root,
        }}
      >
        <KodineKeymapProvider keymap={keymap}>
          <TuiConfigProvider config={resolvedConfig}>
            <KVProvider>
              <ThemeProvider mode="dark">
                <ToastProvider>
                  <DialogProvider>
                    <DialogLanguage initial="tr" onSelect={input.onSelect} />
                  </DialogProvider>
                </ToastProvider>
              </ThemeProvider>
            </KVProvider>
          </TuiConfigProvider>
        </KodineKeymapProvider>
      </TestTuiContexts>
    )
  }

  const app = await testRender(() => <Harness />, { kittyKeyboard: true })
  return {
    app,
    registrations,
    async cleanup() {
      app.renderer.destroy()
    },
  }
}

test("language dialog selects the highlighted option on Enter", async () => {
  await using tmp = await tmpdir()
  const selected: string[] = []
  const dialog = await mountLanguage({ root: tmp.path, onSelect: (value) => selected.push(value) })

  try {
    // Bindings register via useBindings effects after the initial render pass.
    // The dialog layer is the only priority-1 layer binding return.
    await wait(() => dialog.registrations.some((layer) => layer.priority === 1 && layer.keys.includes("return")))
    dialog.app.mockInput.pressEnter()
    expect(selected).toEqual(["tr"])
  } finally {
    await dialog.cleanup()
  }
})

test("language dialog arrows move the highlight before Enter", async () => {
  await using tmp = await tmpdir()
  const selected: string[] = []
  const dialog = await mountLanguage({ root: tmp.path, onSelect: (value) => selected.push(value) })

  try {
    await wait(() => dialog.registrations.some((layer) => layer.priority === 1 && layer.keys.includes("return")))
    dialog.app.mockInput.pressArrow("right")
    dialog.app.mockInput.pressEnter()
    expect(selected).toEqual(["en"])
  } finally {
    await dialog.cleanup()
  }
})
