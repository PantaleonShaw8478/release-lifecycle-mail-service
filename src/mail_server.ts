import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiMailError } from "./infrai_mail.ts";
import { deliverLifecycleMail } from "./lifecycle_mail.ts";

function writeJson(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/lifecycle-mail") {
    writeJson(response, 404, { error: "Route not found" });
    return;
  }

  let raw = "";
  for await (const chunk of request) raw += chunk;
  try {
    const result = await deliverLifecycleMail(JSON.parse(raw));
    writeJson(response, 202, result);
  } catch (error) {
    if (error instanceof ZodError) {
      writeJson(response, 400, { error: "Invalid lifecycle mail request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiMailError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      writeJson(response, status, { error: error.message });
      return;
    }
    writeJson(response, 500, { error: "Unable to deliver lifecycle mail" });
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Lifecycle mail service listening on http://localhost:3000");
});
