import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, For, onMount } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { useTuiConfig } from "../config"
import { useTheme } from "../context/theme"
import { useSDK } from "../context/sdk"
import { InstallationVersion } from "@kodine-ai/core/installation/version"
import { COMMAND_PALETTE_COMMAND, formatKeyBindings, useKeymapSelector } from "../keymap"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { useI18n } from "../i18n"

let once = false

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const { theme } = useTheme()
  const sdk = useSDK()
  const i18n = useI18n()
  const placeholder = createMemo(() => ({
    normal: [
      i18n.t("home.placeholder.fixTodo"),
      i18n.t("home.placeholder.techStack"),
      i18n.t("home.placeholder.fixTests"),
    ],
    shell: ["ls -la", "git status", "pwd"],
  }))
  const hintBindings = useKeymapSelector((keymap) =>
    keymap.getCommandBindings({
      visibility: "registered",
      commands: [COMMAND_PALETTE_COMMAND, "session.new", "model.list", "agent.list"],
    }),
  )
  const hints = createMemo(() =>
    [
      { command: COMMAND_PALETTE_COMMAND, label: i18n.t("home.hint.commands") },
      { command: "session.new", label: i18n.t("home.hint.newSession") },
      { command: "model.list", label: i18n.t("home.hint.models") },
      { command: "agent.list", label: i18n.t("home.hint.agents") },
    ]
      .map((hint) => ({ ...hint, keys: formatKeyBindings(hintBindings().get(hint.command) ?? [], tuiConfig) }))
      .filter((hint) => hint.keys),
  )
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexGrow={1} minHeight={0} />
        <box height={4} minHeight={0} flexShrink={1} />
        <box flexShrink={0}>
          <pluginRuntime.Slot name="home_logo" mode="replace">
            <Logo />
          </pluginRuntime.Slot>
        </box>
        <box flexShrink={0} paddingTop={1} flexDirection="row" gap={2}>
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>
            v{InstallationVersion}
          </text>
          <text fg={theme.borderSubtle}>·</text>
          <text fg={theme.textMuted}>{sdk.directory}</text>
        </box>
        <box height={1} minHeight={0} flexShrink={1} />
        <box width="100%" maxWidth={promptMaxWidth()} zIndex={1000} paddingTop={1} flexShrink={0}>
          <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
            <Prompt ref={bind} right={<pluginRuntime.Slot name="home_prompt_right" />} placeholders={placeholder()} />
          </pluginRuntime.Slot>
        </box>
        <box flexDirection="row" gap={3} paddingTop={1} flexShrink={0}>
          <For each={hints()}>
            {(hint) => (
              <text>
                <span style={{ fg: theme.primary }}>{hint.keys}</span>
                <span style={{ fg: theme.textMuted }}> {hint.label}</span>
              </text>
            )}
          </For>
        </box>
        <pluginRuntime.Slot name="home_bottom" />
        <box flexGrow={1} minHeight={0} />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <pluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </HomeSessionDestinationProvider>
  )
}
