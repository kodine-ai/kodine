/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeKodineContent from "./skill/customize-kodine.md" with { type: "text" }

export const CustomizeKodineContent = customizeKodineContent

export const Plugin = define({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-kodine",
            description:
              "Use ONLY when the user is editing or creating kodine's own configuration: kodine.json, kodine.jsonc, files under .kodine/, or files under ~/.config/kodine/. Also use when creating or fixing kodine agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring kodine itself.",
            location: AbsolutePath.make("/builtin/customize-kodine.md"),
            content: CustomizeKodineContent,
          }),
        }),
      )
    })
  }),
})
