import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@kodine-ai/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~kodine/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~kodine/WorkspaceRef", {
  defaultValue: () => undefined,
})
