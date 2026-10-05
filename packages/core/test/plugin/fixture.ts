import { AgentV2 } from "@kodine-ai/core/agent"
import { AISDK } from "@kodine-ai/core/aisdk"
import { Catalog } from "@kodine-ai/core/catalog"
import { CommandV2 } from "@kodine-ai/core/command"
import { Credential } from "@kodine-ai/core/credential"
import { AppNodeBuilder } from "@kodine-ai/core/effect/app-node-builder"
import { LayerNodePlatform } from "@kodine-ai/core/effect/app-node-platform"
import { LayerNode } from "@kodine-ai/core/effect/layer-node"
import { EventV2 } from "@kodine-ai/core/event"
import { FileSystem } from "@kodine-ai/core/filesystem"
import { FSUtil } from "@kodine-ai/core/fs-util"
import { Integration } from "@kodine-ai/core/integration"
import { Location } from "@kodine-ai/core/location"
import { Npm } from "@kodine-ai/core/npm"
import { PluginV2 } from "@kodine-ai/core/plugin"
import { Reference } from "@kodine-ai/core/reference"
import { SkillV2 } from "@kodine-ai/core/skill"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
  ],
)
