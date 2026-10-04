import path from "path"

process.env.KODINE_DB = ":memory:"
process.env.NPM_CONFIG_AUDIT = "false"
process.env.KODINE_MODELS_PATH = path.join(import.meta.dir, "plugin", "fixtures", "models-dev.json")
process.env.KODINE_DISABLE_MODELS_FETCH = "true"
