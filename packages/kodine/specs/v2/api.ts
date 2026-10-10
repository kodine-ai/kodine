// @ts-nocheck

import { Kodine } from "@kodine-ai/core"
import { ReadTool } from "@kodine-ai/core/tools"

const kodine = Kodine.make({})

kodine.tool.add(ReadTool)

kodine.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

kodine.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

kodine.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await kodine.session.create({
  agent: "build",
})

kodine.subscribe((event) => {
  console.log(event)
})

await kodine.session.prompt({
  sessionID,
  text: "hey what is up",
})

await kodine.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await kodine.session.wait()

console.log(await kodine.session.messages(sessionID))
