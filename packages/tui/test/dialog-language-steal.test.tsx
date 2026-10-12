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

// Regression guard: when any background layer (re)registers a "return" binding
// AFTER a dialog's layer, keymap layer ordering (priority, then newest order
// first) must still let the modal dialog win. Dialog layers carry priority: 1.
test("later-registered background layer cannot steal return from the language dialog", async () => {
  await using tmp = await tmpdir()
  const state = path.join(tmp.path, "state")
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

  const selected: string[] = []
  const stolen: string[] = []
  let keymapRef: any

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    keymapRef = keymap
    const resolvedConfig = createTuiResolvedConfig({ leader_timeout: 1000 })
    const off = registerKodineKeymap(keymap, renderer, resolvedConfig)
    onCleanup(off)

    return (
      <TestTuiContexts directory={tmp.path} paths={{ home: tmp.path, state, worktree: tmp.path }}>
        <KodineKeymapProvider keymap={keymap}>
          <TuiConfigProvider config={resolvedConfig}>
            <KVProvider>
              <ThemeProvider mode="dark">
                <ToastProvider>
                  <DialogProvider>
                    <DialogLanguage initial="tr" onSelect={(value) => selected.push(value)} />
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
  try {
    await Bun.sleep(100)
    app.mockInput.pressEnter()
    await Bun.sleep(50)
    console.log("before background re-register -> selected:", JSON.stringify(selected), "stolen:", JSON.stringify(stolen))

    // Any background component re-registering its layer (theme refresh, data
    // reload, ...) gets a newer order and lands on top of the dialog's layer.
    keymapRef.registerLayer({
      bindings: [{ key: "return", desc: "background", cmd: () => stolen.push("bg") }],
    })
    await Bun.sleep(50)

    app.mockInput.pressEnter()
    await Bun.sleep(50)
    console.log("after background re-register  -> selected:", JSON.stringify(selected), "stolen:", JSON.stringify(stolen))

    expect(stolen).toEqual([])
    expect(selected).toEqual(["tr", "tr"])
  } finally {
    app.renderer.destroy()
  }
})
