import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "./dialog"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useBindings } from "../keymap"
import type { Locale } from "../i18n"

const options: { title: string; value: Locale }[] = [
  { title: "Türkçe", value: "tr" },
  { title: "English", value: "en" },
]

export function DialogLanguage(props: { initial: Locale; onSelect: (locale: Locale) => void }) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: Math.max(0, options.findIndex((option) => option.value === props.initial)),
  })

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Confirm language selection",
        group: "Dialog",
        cmd: () => {
          props.onSelect(options[store.active].value)
          dialog.clear()
        },
      },
      {
        key: "left",
        desc: "Previous language option",
        group: "Dialog",
        cmd: () => {
          setStore("active", store.active === 0 ? options.length - 1 : store.active - 1)
        },
      },
      {
        key: "right",
        desc: "Next language option",
        group: "Dialog",
        cmd: () => {
          setStore("active", (store.active + 1) % options.length)
        },
      },
    ],
  }))
  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Language / Dil
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>Arayüz dilini seç / Choose your language</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <For each={options}>
          {(option, index) => (
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index() === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                props.onSelect(option.value)
                dialog.clear()
              }}
            >
              <text fg={index() === store.active ? theme.selectedListItemText : theme.textMuted}>{option.title}</text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}

DialogLanguage.show = (dialog: DialogContext, initial: Locale) => {
  return new Promise<Locale | undefined>((resolve) => {
    dialog.replace(
      () => (
        <DialogLanguage
          initial={initial}
          onSelect={(locale) => resolve(locale)}
        />
      ),
      () => resolve(undefined),
    )
  })
}
