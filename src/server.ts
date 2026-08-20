import { app } from "./app.js";
import { APP_NAME } from "./config.js";

const port = Number(process.env.PORT ?? 8000);

app.listen(port, ({ hostname, port: listenPort }) => {
  console.log(`${APP_NAME} API listening on http://${hostname}:${listenPort}`);
});
