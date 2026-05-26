import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";

export const metaModule = new Elysia({ name: "timeforschool.meta" })
  .use(modelsPlugin)
  .get(
  "/",
  () => ({
    name: "TimeForSchool",
    version: "0.0.1",
    docs: "/docs",
    openapi: "/docs/json",
  }),
  {
    detail: {
      tags: ["Meta"],
      summary: "API info",
      description: "Service name, version, and links to interactive documentation.",
    },
    response: {
      200: "ApiMeta",
    },
  },
  );
