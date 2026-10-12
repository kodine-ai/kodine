import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["KODINE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["KODINE_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("KODINE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  KODINE_AUTO_HEAP_SNAPSHOT: truthy("KODINE_AUTO_HEAP_SNAPSHOT"),
  KODINE_GIT_BASH_PATH: process.env["KODINE_GIT_BASH_PATH"],
  KODINE_CONFIG: process.env["KODINE_CONFIG"],
  KODINE_CONFIG_CONTENT: process.env["KODINE_CONFIG_CONTENT"],
  KODINE_DISABLE_AUTOUPDATE: truthy("KODINE_DISABLE_AUTOUPDATE"),
  KODINE_ALWAYS_NOTIFY_UPDATE: truthy("KODINE_ALWAYS_NOTIFY_UPDATE"),
  KODINE_DISABLE_PRUNE: truthy("KODINE_DISABLE_PRUNE"),
  KODINE_DISABLE_TERMINAL_TITLE: truthy("KODINE_DISABLE_TERMINAL_TITLE"),
  KODINE_SHOW_TTFD: truthy("KODINE_SHOW_TTFD"),
  KODINE_DISABLE_AUTOCOMPACT: truthy("KODINE_DISABLE_AUTOCOMPACT"),
  KODINE_DISABLE_MODELS_FETCH: truthy("KODINE_DISABLE_MODELS_FETCH"),
  KODINE_DISABLE_MOUSE: truthy("KODINE_DISABLE_MOUSE"),
  KODINE_FAKE_VCS: process.env["KODINE_FAKE_VCS"],
  KODINE_SERVER_PASSWORD: process.env["KODINE_SERVER_PASSWORD"],
  KODINE_SERVER_USERNAME: process.env["KODINE_SERVER_USERNAME"],
  KODINE_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("KODINE_DISABLE_FFF"),

  // Experimental
  KODINE_EXPERIMENTAL_FILEWATCHER: Config.boolean("KODINE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  KODINE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("KODINE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  KODINE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("KODINE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  KODINE_MODELS_URL: process.env["KODINE_MODELS_URL"],
  KODINE_MODELS_PATH: process.env["KODINE_MODELS_PATH"],
  KODINE_DB: process.env["KODINE_DB"],

  KODINE_WORKSPACE_ID: process.env["KODINE_WORKSPACE_ID"],
  KODINE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("KODINE_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get KODINE_DISABLE_PROJECT_CONFIG() {
    return truthy("KODINE_DISABLE_PROJECT_CONFIG")
  },
  get KODINE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("KODINE_EXPERIMENTAL_REFERENCES")
  },
  get KODINE_TUI_CONFIG() {
    return process.env["KODINE_TUI_CONFIG"]
  },
  get KODINE_CONFIG_DIR() {
    return process.env["KODINE_CONFIG_DIR"]
  },
  get KODINE_PURE() {
    return truthy("KODINE_PURE")
  },
  get KODINE_PERMISSION() {
    return process.env["KODINE_PERMISSION"]
  },
  get KODINE_PLUGIN_META_FILE() {
    return process.env["KODINE_PLUGIN_META_FILE"]
  },
  get KODINE_CLIENT() {
    return process.env["KODINE_CLIENT"] ?? "cli"
  },
}
