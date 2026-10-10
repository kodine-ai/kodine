export * as PublicEventManifest from "./public-event-manifest"

import { Event } from "@kodine-ai/schema/event"
import { EventManifest } from "@kodine-ai/schema/event-manifest"

export const Definitions = EventManifest.ServerDefinitions
export const Latest = Event.latest(Definitions)
