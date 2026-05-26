import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8000);

app.listen(port, ({ hostname, port: listenPort }) => {
  console.log(`SchoolKit listening on http://${hostname}:${listenPort}`);
});
