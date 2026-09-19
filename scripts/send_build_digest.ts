import { deliverLifecycleMail } from "../src/lifecycle_mail.ts";

const recipient = process.env.DEMO_EMAIL_TO;
const diagnosticTemplate = process.env.DIAGNOSTIC_TEMPLATE_ID;
const releaseTemplate = process.env.RELEASE_TEMPLATE_ID;
const rollbackTemplate = process.env.ROLLBACK_TEMPLATE_ID;

if (!recipient || !diagnosticTemplate || !releaseTemplate || !rollbackTemplate) {
  throw new Error("DEMO_EMAIL_TO and the three template ID variables are required");
}

const result = await deliverLifecycleMail({
  event: "build.failed",
  releaseId: "build-184",
  recipient,
  templates: {
    diagnostic: diagnosticTemplate,
    release: releaseTemplate,
    rollback: rollbackTemplate
  },
  buildUrl: "https://ci.example.test/builds/184",
  summary: "Typecheck stopped the release."
});

console.log("Lifecycle diagnostic sent:", result);
