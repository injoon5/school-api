import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { ApiError } from "./errors/api-error.js";
import { classesModule } from "./modules/classes/index.js";
import { lunchModule } from "./modules/lunch/index.js";
import { metaModule } from "./modules/meta/index.js";
import { scheduleModule } from "./modules/schedule/index.js";
import { schoolModule } from "./modules/school/index.js";
import { timetableModule } from "./modules/timetable/index.js";
import { openApiPluginConfig } from "./openapi-config.js";
import { modelsPlugin } from "./plugins/models.js";

export const app = new Elysia({ name: "timeforschool" })
  .onError(({ error, set, code }) => {
    if (code === "VALIDATION") {
      const apiError = ApiError.validation(
        "One or more query parameters are invalid.",
        {
          summary:
            error instanceof Error
              ? error.message
              : "See /docs for required formats.",
        },
      );
      set.status = apiError.httpStatus;
      return apiError.toJSON();
    }

    const apiError =
      error instanceof ApiError ? error : ApiError.fromUnknown(error);

    set.status = apiError.httpStatus;
    return apiError.toJSON();
  })
  .use(openapi(openApiPluginConfig))
  .use(modelsPlugin)
  .use(metaModule)
  .use(schoolModule)
  .use(classesModule)
  .use(timetableModule)
  .use(lunchModule)
  .use(scheduleModule);

export default app;
