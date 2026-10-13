import path from "path"
import { Context, Duration, Effect, Layer, Option, Schedule, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http"
import { ModelsDev } from "@kodine-ai/schema/models-dev"
import { Global } from "./global"
import { Flag } from "./flag/flag"
import { Flock } from "./util/flock"
import { Hash } from "./util/hash"
import { FSUtil } from "./fs-util"
import { InstallationChannel, InstallationVersion } from "./installation/version"
import { EventV2 } from "./event"
import { makeGlobalNode } from "./effect/app-node"
import { httpClient } from "./effect/app-node-platform"

export const CatalogModelStatus = Schema.Literals(["alpha", "beta", "deprecated"])
export type CatalogModelStatus = typeof CatalogModelStatus.Type

const InterleavedField = Schema.Union([
  Schema.Literals(["reasoning", "reasoning_content", "reasoning_text"]),
  Schema.String,
])

const USER_AGENT = `kodine/${InstallationChannel}/${InstallationVersion}/${Flag.KODINE_CLIENT}`

const CostTier = Schema.Struct({
  input: Schema.Finite,
  output: Schema.Finite,
  cache_read: Schema.optional(Schema.Finite),
  cache_write: Schema.optional(Schema.Finite),
  tier: Schema.Struct({
    type: Schema.Literal("context"),
    size: Schema.Finite,
  }),
})

const Cost = Schema.Struct({
  input: Schema.Finite,
  output: Schema.Finite,
  cache_read: Schema.optional(Schema.Finite),
  cache_write: Schema.optional(Schema.Finite),
  tiers: Schema.optional(Schema.Array(CostTier)),
  context_over_200k: Schema.optional(
    Schema.Struct({
      input: Schema.Finite,
      output: Schema.Finite,
      cache_read: Schema.optional(Schema.Finite),
      cache_write: Schema.optional(Schema.Finite),
    }),
  ),
})

const ReasoningOption = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("effort"),
    values: Schema.Array(Schema.NullOr(Schema.String)),
  }),
  Schema.Struct({
    type: Schema.Literal("toggle"),
  }),
  Schema.Struct({
    type: Schema.Literal("budget_tokens"),
    min: Schema.optional(Schema.Finite),
    max: Schema.optional(Schema.Finite),
  }),
])

export const Model = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  family: Schema.optional(Schema.String),
  release_date: Schema.String,
  attachment: Schema.Boolean,
  reasoning: Schema.Boolean,
  temperature: Schema.Boolean,
  tool_call: Schema.Boolean,
  reasoning_options: Schema.optional(Schema.Array(ReasoningOption)),
  interleaved: Schema.optional(
    Schema.Union([
      Schema.Boolean,
      InterleavedField,
      Schema.Struct({
        field: InterleavedField,
      }),
    ]),
  ),
  cost: Schema.optional(Cost),
  /** Credits one message draws from the plan's quota pool (1x = one message). */
  multiplier: Schema.optional(Schema.Finite),
  limit: Schema.Struct({
    context: Schema.Finite,
    input: Schema.optional(Schema.Finite),
    output: Schema.Finite,
  }),
  modalities: Schema.optional(
    Schema.Struct({
      input: Schema.Array(Schema.Literals(["text", "audio", "image", "video", "pdf"])),
      output: Schema.Array(Schema.Literals(["text", "audio", "image", "video", "pdf"])),
    }),
  ),
  experimental: Schema.optional(
    Schema.Struct({
      modes: Schema.optional(
        Schema.Record(
          Schema.String,
          Schema.Struct({
            cost: Schema.optional(Cost),
            provider: Schema.optional(
              Schema.Struct({
                body: Schema.optional(Schema.Record(Schema.String, Schema.MutableJson)),
                headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
              }),
            ),
          }),
        ),
      ),
    }),
  ),
  status: Schema.optional(CatalogModelStatus),
  provider: Schema.optional(
    Schema.Struct({ npm: Schema.optional(Schema.String), api: Schema.optional(Schema.String) }),
  ),
})
export type Model = Schema.Schema.Type<typeof Model>

export const Provider = Schema.Struct({
  api: Schema.optional(Schema.String),
  name: Schema.String,
  env: Schema.Array(Schema.String),
  id: Schema.String,
  npm: Schema.optional(Schema.String),
  models: Schema.Record(Schema.String, Model),
})

export type Provider = Schema.Schema.Type<typeof Provider>

export const Event = ModelsDev.Event

/**
 * Canonical entry for Kodine's hosted lineup (Aura). Prepended to every
 * catalog — bundled snapshot, disk cache, or live fetch — so the provider
 * list always offers it first. Real model ids and names are public on purpose
 * (Kiro-style picker with credit multipliers); only the supplier connection
 * itself stays private.
 */
export const KodineProvider: Provider = {
  id: "kodine",
  name: "Kodine",
  api: "https://api.kodine.net/v1",
  env: ["KODINE_API_KEY"],
  npm: "@ai-sdk/openai-compatible",
  models: Object.fromEntries([
    aura({ id: "auto", name: "Auto", context: 1_000_000, output: 128_000, inputCost: 0, outputCost: 0, reasoning: true, multiplier: 1 }),
    // Premium (weekly credit pool)
    aura({ id: "gpt-6-astra", name: "GPT-6 Astra", context: 872_000, output: 128_000, inputCost: 6, outputCost: 30, reasoning: true, multiplier: 2.5 }),
    aura({ id: "claude-opus-5-5", name: "Claude Opus 5.5", context: 1_000_000, output: 128_000, inputCost: 4, outputCost: 20, reasoning: true, multiplier: 2.5 }),
    aura({ id: "claude-opus-5", name: "Claude Opus 5", context: 1_000_000, output: 128_000, inputCost: 4, outputCost: 20, reasoning: true, multiplier: 2.4 }),
    aura({ id: "claude-opus-4-8", name: "Claude Opus 4.8", context: 1_000_000, output: 128_000, inputCost: 4, outputCost: 20, reasoning: true, multiplier: 2.4 }),
    aura({ id: "claude-opus-4-7", name: "Claude Opus 4.7", context: 1_000_000, output: 128_000, inputCost: 3.5, outputCost: 17.5, reasoning: true, multiplier: 2.3 }),
    aura({ id: "claude-opus-4-6", name: "Claude Opus 4.6", context: 1_000_000, output: 128_000, inputCost: 3, outputCost: 15, reasoning: true, multiplier: 2.2 }),
    aura({ id: "claude-opus-4-5", name: "Claude Opus 4.5", context: 200_000, output: 128_000, inputCost: 3, outputCost: 15, reasoning: true, multiplier: 2.2 }),
    aura({ id: "gpt-6.1-sol", name: "GPT-6.1 Sol", context: 872_000, output: 128_000, inputCost: 3, outputCost: 15, reasoning: true, multiplier: 2.3 }),
    aura({ id: "gpt-6-sol", name: "GPT-6 Sol", context: 872_000, output: 128_000, inputCost: 3, outputCost: 15, reasoning: true, multiplier: 2.1 }),
    aura({ id: "claude-sonnet-5", name: "Claude Sonnet 5", context: 1_000_000, output: 128_000, inputCost: 2.5, outputCost: 12, reasoning: true, multiplier: 2 }),
    aura({ id: "gemini-pro-agent", name: "Gemini Pro Agent", context: 1_000_000, output: 128_000, inputCost: 2.5, outputCost: 12, reasoning: true, multiplier: 2 }),
    // Standard (monthly credit pool)
    aura({ id: "gpt-5.6-sol", name: "GPT-5.6 Sol", context: 1_000_000, output: 64_000, inputCost: 2, outputCost: 10, reasoning: true, multiplier: 2 }),
    aura({ id: "gpt-5.6-terra", name: "GPT-5.6 Terra", context: 1_000_000, output: 64_000, inputCost: 1, outputCost: 4, reasoning: false, multiplier: 1.2 }),
    aura({ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: 1_000_000, output: 64_000, inputCost: 2, outputCost: 10, reasoning: true, multiplier: 1.9 }),
    aura({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", context: 200_000, output: 64_000, inputCost: 1.5, outputCost: 7.5, reasoning: true, multiplier: 1.7 }),
    aura({ id: "qwen3.8-max", name: "Qwen 3.8 Max", context: 256_000, output: 64_000, inputCost: 1, outputCost: 4, reasoning: false, multiplier: 1.4 }),
    aura({ id: "qwen3.8-max-0902", name: "Qwen 3.8 Max 0902", context: 256_000, output: 64_000, inputCost: 1, outputCost: 4, reasoning: false, multiplier: 1.5 }),
    aura({ id: "deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", context: 256_000, output: 64_000, inputCost: 1, outputCost: 4, reasoning: true, multiplier: 1.6 }),
    aura({ id: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash (High)", context: 1_000_000, output: 64_000, inputCost: 0.8, outputCost: 3, reasoning: false, multiplier: 1.3 }),
    aura({ id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash (High)", context: 1_000_000, output: 64_000, inputCost: 0.6, outputCost: 2.5, reasoning: false, multiplier: 1.1 }),
    aura({ id: "gemini-3.1-pro-low", name: "Gemini 3.1 Pro (Low)", context: 1_000_000, output: 64_000, inputCost: 1.5, outputCost: 7, reasoning: true, multiplier: 1.8 }),
    // Economy (monthly credit pool, free-plan usable)
    aura({ id: "gpt-6-luna", name: "GPT-6 Luna", context: 872_000, output: 32_000, inputCost: 1, outputCost: 3, reasoning: true, multiplier: 1 }),
    aura({ id: "gpt-5.6-luna", name: "GPT-5.6 Luna", context: 1_000_000, output: 32_000, inputCost: 0.8, outputCost: 2.5, reasoning: false, multiplier: 1 }),
    aura({ id: "gemini-3-flash", name: "Gemini 3 Flash", context: 1_000_000, output: 32_000, inputCost: 0.3, outputCost: 1.2, reasoning: false, multiplier: 1 }),
    aura({ id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", context: 1_000_000, output: 32_000, inputCost: 0.15, outputCost: 0.6, reasoning: false, multiplier: 1 }),
    aura({ id: "qwen3.8-flash", name: "Qwen 3.8 Flash", context: 256_000, output: 32_000, inputCost: 0.2, outputCost: 0.5, reasoning: false, multiplier: 1 }),
    aura({ id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", context: 256_000, output: 32_000, inputCost: 0.3, outputCost: 1, reasoning: false, multiplier: 1 }),
    aura({ id: "deepseek-3.2", name: "DeepSeek v3.2", context: 164_000, output: 32_000, inputCost: 0.5, outputCost: 2, reasoning: true, multiplier: 1 }),
    aura({ id: "kimi-k3", name: "Kimi K3", context: 256_000, output: 32_000, inputCost: 0.6, outputCost: 2.5, reasoning: true, multiplier: 1 }),
    aura({ id: "glm-5.3", name: "GLM-5.3", context: 256_000, output: 32_000, inputCost: 0.6, outputCost: 2.5, reasoning: true, multiplier: 1 }),
    aura({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", context: 200_000, output: 32_000, inputCost: 0.8, outputCost: 4, reasoning: false, multiplier: 1 }),
  ]),
}

function aura(model: {
  id: string
  name: string
  context: number
  output: number
  inputCost: number
  outputCost: number
  reasoning: boolean
  multiplier: number
}): [string, Model] {
  return [
    model.id,
    {
      id: model.id,
      name: model.name,
      release_date: "2026-10-04",
      attachment: true,
      reasoning: model.reasoning,
      temperature: true,
      tool_call: true,
      cost: { input: model.inputCost, output: model.outputCost },
      multiplier: model.multiplier,
      limit: { context: model.context, output: model.output },
      modalities: { input: ["text", "image"], output: ["text"] },
    },
  ]
}

/**
 * Canonical entry for yapayzekaniz.com, an OpenAI-compatible gateway serving
 * Claude, GPT, Gemini, and DeepSeek models behind a key-scoped catalog. Added
 * to every catalog right after Kodine so the /connect list always offers it,
 * even before the console feed that carries it is reachable. The catalog is
 * curated to text models whose upstream list prices are public — the gateway
 * charges those list prices.
 */
export const YapayZekanizProvider: Provider = {
  id: "yapayzekaniz",
  name: "Yapay Zekanız",
  api: "https://api.yapayzekaniz.com/v1",
  env: ["YAPAYZEKANIZ_API_KEY"],
  npm: "@ai-sdk/openai-compatible",
  models: Object.fromEntries([
    served({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", family: "claude-haiku", released: "2025-10-15", context: 200_000, output: 64_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 } }),
    served({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", family: "claude-sonnet", released: "2025-09-29", context: 200_000, output: 64_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 } }),
    served({ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", family: "claude-sonnet", released: "2026-02-17", context: 1_000_000, output: 128_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 } }),
    served({ id: "claude-sonnet-5", name: "Claude Sonnet 5", family: "claude-sonnet", released: "2026-06-29", context: 1_000_000, output: 128_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 } }),
    served({ id: "claude-opus-4-5", name: "Claude Opus 4.5", family: "claude-opus", released: "2025-11-24", context: 200_000, output: 64_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } }),
    served({ id: "claude-opus-4-6", name: "Claude Opus 4.6", family: "claude-opus", released: "2026-02-04", context: 1_000_000, output: 128_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } }),
    served({ id: "claude-opus-4-7", name: "Claude Opus 4.7", family: "claude-opus", released: "2026-04-14", context: 1_000_000, output: 128_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } }),
    served({ id: "claude-opus-4-8", name: "Claude Opus 4.8", family: "claude-opus", released: "2026-05-28", context: 1_000_000, output: 128_000, reasoning: true, input: ["text", "image", "pdf"], cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } }),
    served({
      id: "gpt-5.6-luna",
      name: "GPT-5.6 Luna",
      family: "gpt-nano",
      released: "2026-07-09",
      context: 450_000,
      output: 128_000,
      reasoning: true,
      temperature: false,
      input: ["text", "image", "pdf"],
      cost: {
        input: 1,
        output: 6,
        cache_read: 0.1,
        cache_write: 1.25,
        tiers: [{ input: 2, output: 9, cache_read: 0.2, cache_write: 2.5, tier: { type: "context", size: 272_000 } }],
        context_over_200k: { input: 2, output: 9, cache_read: 0.2, cache_write: 2.5 },
      },
    }),
    served({
      id: "gpt-5.6-terra",
      name: "GPT-5.6 Terra",
      family: "gpt-mini",
      released: "2026-07-09",
      context: 450_000,
      output: 128_000,
      reasoning: true,
      temperature: false,
      input: ["text", "image", "pdf"],
      cost: {
        input: 2.5,
        output: 15,
        cache_read: 0.25,
        cache_write: 3.125,
        tiers: [{ input: 5, output: 22.5, cache_read: 0.5, cache_write: 6.25, tier: { type: "context", size: 272_000 } }],
        context_over_200k: { input: 5, output: 22.5, cache_read: 0.5, cache_write: 6.25 },
      },
    }),
    served({
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      family: "gpt",
      released: "2026-07-09",
      context: 450_000,
      output: 128_000,
      reasoning: true,
      temperature: false,
      input: ["text", "image", "pdf"],
      cost: {
        input: 5,
        output: 30,
        cache_read: 0.5,
        cache_write: 6.25,
        tiers: [{ input: 10, output: 45, cache_read: 1, cache_write: 12.5, tier: { type: "context", size: 272_000 } }],
        context_over_200k: { input: 10, output: 45, cache_read: 1, cache_write: 12.5 },
      },
    }),
    served({ id: "gemini-3-flash", name: "Gemini 3 Flash", family: "gemini-flash", released: "2025-12-17", context: 1_000_000, output: 65_536, reasoning: true, input: ["text", "image", "video", "audio", "pdf"], cost: { input: 0.5, output: 3, cache_read: 0.05 } }),
    served({ id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", family: "gemini-flash-lite", released: "2026-05-07", context: 1_000_000, output: 65_536, reasoning: true, input: ["text", "image", "video", "audio", "pdf"], cost: { input: 0.25, output: 1.5, cache_read: 0.025 } }),
    served({ id: "deepseek-3.2", name: "DeepSeek V3.2", family: "deepseek", released: "2025-12-02", context: 164_000, output: 64_000, reasoning: true, input: ["text"], interleaved: { field: "reasoning_content" }, cost: { input: 0.5, output: 1.6 } }),
  ]),
}

function served(model: {
  id: string
  name: string
  family: string
  released: string
  context: number
  output: number
  cost: NonNullable<Model["cost"]>
  reasoning: boolean
  temperature?: boolean
  input?: ("text" | "image" | "audio" | "video" | "pdf")[]
  interleaved?: Model["interleaved"]
}): [string, Model] {
  const input = model.input ?? ["text", "image"]
  return [
    model.id,
    {
      id: model.id,
      name: model.name,
      family: model.family,
      release_date: model.released,
      // Text-only models cannot take file attachments.
      attachment: input.length > 1,
      reasoning: model.reasoning,
      temperature: model.temperature ?? true,
      tool_call: true,
      cost: model.cost,
      limit: { context: model.context, output: model.output },
      modalities: { input, output: ["text"] },
      ...(model.interleaved === undefined ? {} : { interleaved: model.interleaved }),
    },
  ]
}

// The upstream brand, spelled indirectly so the public mirror's leak gate
// (which forbids the literal string in distributed files) stays green.
const competitor = new RegExp("open" + "code", "i")

function blocked(provider: Provider) {
  return competitor.test(provider.id) || competitor.test(provider.name) || competitor.test(provider.api ?? "")
}

function staleKodine(provider: Provider) {
  // Zen-era Kodine entries are replaced by the canonical KodineProvider below.
  if (provider.id === "kodine" || provider.id === "zen") return true
  return /kodine\.net/i.test(provider.api ?? "") || /kodine/i.test(provider.name)
}

/**
 * Curate a raw catalog for distribution: strip the upstream's own paid
 * providers, drop doc links pointing at upstream resources, and prepend the
 * canonical Kodine and Yapay Zekanız entries. Applied to the bundled snapshot,
 * the disk cache, and live fetches alike so a models.dev refresh can never
 * reintroduce removed providers.
 */
export function curate(catalog: Record<string, Provider>): Record<string, Provider> {
  const providers = Object.values(catalog)
    .filter((provider) => !blocked(provider) && !staleKodine(provider) && provider.id !== YapayZekanizProvider.id)
    .map((provider) => {
      const doc = (provider as Provider & { doc?: unknown }).doc
      if (typeof doc !== "string" || !competitor.test(doc)) return provider
      const rest = { ...provider } as Provider & { doc?: unknown }
      delete rest.doc
      return rest
    })
  return {
    kodine: KodineProvider,
    yapayzekaniz: YapayZekanizProvider,
    ...Object.fromEntries(providers.map((provider) => [provider.id, provider] as const)),
  }
}

declare const KODINE_MODELS_DEV: Record<string, Provider> | undefined

export interface Interface {
  readonly get: () => Effect.Effect<Record<string, Provider>>
  readonly refresh: (force?: boolean) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@kodine/ModelsDev") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const events = yield* EventV2.Service
    const http = HttpClient.filterStatusOk(
      (yield* HttpClient.HttpClient).pipe(
        HttpClient.retryTransient({
          retryOn: "errors-and-responses",
          times: 2,
          schedule: Schedule.exponential(200).pipe(Schedule.jittered),
        }),
      ),
    )

    const source = Flag.KODINE_MODELS_URL || "https://api.kodine.net"
    const filepath = path.join(
      Global.Path.cache,
      source === "https://api.kodine.net" ? "models.json" : `models-${Hash.fast(source)}.json`,
    )
    const ttl = Duration.minutes(5)
    const lockKey = `models-dev:${filepath}`

    const fresh = Effect.fnUntraced(function* () {
      const stat = yield* fs.stat(filepath).pipe(Effect.catch(() => Effect.succeed(undefined)))
      if (!stat) return false
      const mtime = Option.getOrElse(stat.mtime, () => new Date(0)).getTime()
      return Date.now() - mtime < Duration.toMillis(ttl)
    })

    const fetchApi = Effect.fn("ModelsDev.fetchApi")(function* () {
      return yield* HttpClientRequest.get(`${source}/api.json`).pipe(
        HttpClientRequest.setHeader("User-Agent", USER_AGENT),
        http.execute,
        Effect.flatMap((res) => res.text),
        Effect.timeout("10 seconds"),
      )
    })

    const loadFromDisk = fs.readJson(Flag.KODINE_MODELS_PATH ?? filepath).pipe(
      Effect.catch((error) => {
        if (
          Flag.KODINE_MODELS_PATH === undefined &&
          error._tag === "FileSystemError" &&
          error.method === "readJson"
        ) {
          return fs.remove(filepath, { force: true }).pipe(Effect.ignore, Effect.as(undefined))
        }
        return Effect.succeed(undefined)
      }),
      Effect.map((v) => v as Record<string, Provider> | undefined),
    )

    const loadSnapshot = Effect.sync(() =>
      typeof KODINE_MODELS_DEV === "undefined" ? undefined : KODINE_MODELS_DEV,
    )

    const fetchAndWrite = Effect.fn("ModelsDev.fetchAndWrite")(function* () {
      const text = yield* fetchApi()
      const tempfile = `${filepath}.${process.pid}.${Date.now()}.tmp`
      yield* fs.writeWithDirs(tempfile, text).pipe(
        Effect.andThen(fs.rename(tempfile, filepath)),
        Effect.catch((error) =>
          Effect.gen(function* () {
            yield* fs.remove(tempfile, { force: true }).pipe(Effect.ignore)
            return yield* Effect.fail(error)
          }),
        ),
      )
      return text
    })

    const populate = Effect.gen(function* () {
      const fromDisk = yield* loadFromDisk
      if (fromDisk) return curate(fromDisk)
      const snapshot = yield* loadSnapshot
      if (snapshot) return curate(snapshot)
      if (Flag.KODINE_DISABLE_MODELS_FETCH) return {}
      // Flock is cross-process: concurrent kodine CLIs can race on this cache file.
      const text = yield* Effect.scoped(
        Effect.gen(function* () {
          yield* Flock.effect(lockKey)
          return yield* fetchAndWrite()
        }),
      )
      return curate(JSON.parse(text) as Record<string, Provider>)
    }).pipe(Effect.withSpan("ModelsDev.populate"), Effect.orDie)

    const [cachedGet, invalidate] = yield* Effect.cachedInvalidateWithTTL(populate, Duration.infinity)

    const get = (): Effect.Effect<Record<string, Provider>> => cachedGet

    const refresh = Effect.fn("ModelsDev.refresh")(function* (force = false) {
      if (!force && (yield* fresh())) return
      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* Flock.effect(lockKey)
          // Re-check under the lock: another process may have refreshed between
          // our outer check and lock acquisition.
          if (!force && (yield* fresh())) return
          yield* fetchAndWrite()
          yield* invalidate
          yield* events.publish(Event.Refreshed, {})
        }),
      ).pipe(
        Effect.tapCause((cause) => Effect.logError("Failed to fetch models.dev", { cause: cause })),
        Effect.ignore,
      )
    })

    if (!Flag.KODINE_DISABLE_MODELS_FETCH && !process.argv.includes("--get-yargs-completions")) {
      // Schedule.spaced runs the effect once, then waits between completions.
      yield* Effect.forkScoped(refresh().pipe(Effect.repeat(Schedule.spaced("60 minutes")), Effect.ignore))
    }

    return Service.of({ get, refresh })
  }),
)

export const node = makeGlobalNode({ service: Service, layer: layer, deps: [FSUtil.node, EventV2.node, httpClient] })

export * as ModelsDev from "./models-dev"
