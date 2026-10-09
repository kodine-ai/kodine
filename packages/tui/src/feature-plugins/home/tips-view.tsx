import type { TuiPluginApi } from "@kodine-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"
import { useI18n, type Key } from "../../i18n"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const i18n = useI18n()
  const t = i18n.t
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("kodine.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }

  const withKeys = (key: Key, shortcut: string) => (shortcut ? t(key, { keys: shortcutText(shortcut) }) : undefined)
  const comboValue = (command: string, shortcut: string) =>
    shortcut ? `${shortcutText(command)} ${t("tips.or")} ${shortcutText(shortcut)}` : shortcutText(command)
  const withCombo = (key: Key, command: string, shortcut: string) => t(key, { combo: comboValue(command, shortcut) })

  const tip = createMemo(() => {
    if (props.connected === false) return t("tips.connect")
    const quickSwitch = () => {
      const first = shortcuts.sessionQuickSwitch1()
      const last = shortcuts.sessionQuickSwitch9()
      if (!first || !last) return undefined
      return t("tips.quickSwitch", { first: shortcutText(first), last: shortcutText(last) })
    }
    const pageHistory = () => {
      const up = shortcuts.messagesPageUp()
      const down = shortcuts.messagesPageDown()
      if (!up || !down) return undefined
      return t("tips.pageHistory", { up: shortcutText(up), down: shortcutText(down) })
    }
    const childSessions = () => {
      const items = [
        shortcuts.sessionParent(),
        shortcuts.childFirst(),
        shortcuts.childPrevious(),
        shortcuts.childNext(),
      ].filter(Boolean)
      if (!items.length) return undefined
      return t("tips.childSessions", { items: items.map(shortcutText).join(" / ") })
    }
    const tips = [
      t("tips.attachFiles"),
      t("tips.shellBang"),
      withKeys("tips.agentCycle", shortcuts.agentCycle()),
      t("tips.undo"),
      t("tips.redo"),
      t("tips.share"),
      t("tips.dragDrop"),
      withKeys("tips.pasteImages", shortcuts.inputPaste()),
      withCombo("tips.editor", "/editor", shortcuts.editorOpen()),
      t("tips.init"),
      withCombo("tips.models", "/models", shortcuts.modelList()),
      t("tips.themes", { combo: comboValue("/themes", shortcuts.themeList()), count: themeCount }),
      withCombo("tips.new", "/new", shortcuts.sessionNew()),
      withCombo("tips.sessions", "/sessions", shortcuts.sessionList()),
      withKeys("tips.pinSession", shortcuts.sessionPinToggle()),
      quickSwitch(),
      t("tips.compact"),
      withCombo("tips.export", "/export", shortcuts.sessionExport()),
      withKeys("tips.copyMessage", shortcuts.messagesCopy()),
      withKeys("tips.commandList", shortcuts.commandList()),
      t("tips.connectProviders"),
      withKeys("tips.cycleRecentModels", shortcuts.modelCycleRecent()),
      withKeys("tips.sidebar", shortcuts.sessionSidebarToggle()),
      pageHistory(),
      withKeys("tips.firstMessage", shortcuts.messagesFirst()),
      withKeys("tips.lastMessage", shortcuts.messagesLast()),
      withKeys("tips.newline", shortcuts.inputNewline()),
      withKeys("tips.clearInput", shortcuts.inputClear()),
      withKeys("tips.interrupt", shortcuts.sessionInterrupt()),
      t("tips.planAgent"),
      t("tips.subagents"),
      childSessions(),
      t("tips.configFiles"),
      t("tips.globalConfig"),
      t("tips.schema"),
      t("tips.defaultModel"),
      t("tips.keybindOverride"),
      t("tips.keybindNone"),
      t("tips.mcp"),
      t("tips.commands"),
      t("tips.arguments"),
      t("tips.backticks"),
      t("tips.agents"),
      t("tips.permissions"),
      t("tips.bashPatterns"),
      t("tips.denyRm"),
      t("tips.askPush"),
      t("tips.formatterEnable"),
      t("tips.formatterDisable"),
      t("tips.formatterCustom"),
      t("tips.lsp"),
      t("tips.tools"),
      t("tips.toolScripts"),
      t("tips.plugins"),
      t("tips.notifyPlugin"),
      t("tips.protectPlugin"),
      t("tips.runScript"),
      t("tips.continue"),
      t("tips.attachCli"),
      t("tips.jsonFormat"),
      t("tips.serve"),
      t("tips.attach"),
      t("tips.upgrade"),
      t("tips.authList"),
      t("tips.agentCreate"),
      t("tips.ghMention"),
      t("tips.ghInstall"),
      t("tips.ghFix"),
      t("tips.ghReview"),
      t("tips.themeSystem"),
      t("tips.customThemes"),
      t("tips.themeModes"),
      t("tips.xtermColors"),
      t("tips.envVars"),
      t("tips.fileInclude"),
      t("tips.instructions"),
      t("tips.temperature"),
      t("tips.steps"),
      t("tips.disableTools"),
      t("tips.disableMcp"),
      t("tips.agentToolOverride"),
      t("tips.shareAuto"),
      t("tips.shareDisabled"),
      t("tips.unshare"),
      t("tips.doomLoop"),
      t("tips.externalDir"),
      t("tips.debugConfig"),
      t("tips.printLogs"),
      withCombo("tips.timeline", "/timeline", shortcuts.sessionTimeline()),
      withKeys("tips.conceal", shortcuts.messagesToggleConceal()),
      withCombo("tips.status", "/status", shortcuts.statusView()),
      t("tips.scrollAccel"),
      shortcuts.commandList()
        ? t("tips.username", { keys: shortcutText(shortcuts.commandList()) })
        : t("tips.usernameNoKeys"),
      t("tips.docker"),
      t("tips.aura"),
      t("tips.agentsMd"),
      t("tips.review"),
      withCombo("tips.help", "/help", shortcuts.helpShow()),
      t("tips.rename"),
      process.platform !== "win32"
        ? withKeys("tips.suspend", shortcuts.terminalSuspend())
        : withKeys("tips.inputUndo", shortcuts.inputUndo()),
    ].flatMap((value) => (value ? [value] : []))
    return tips[Math.floor(tipOffset * tips.length)] ?? t("tips.connect")
  })
  const parts = createMemo(() => parse(tip()))

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        ● Tip{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}
