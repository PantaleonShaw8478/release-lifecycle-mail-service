import { z } from "zod";
import { infrai } from "./infrai_mail.ts";

export const lifecycleInput = z.object({
  event: z.enum(["build.failed", "release.published", "release.rolled_back"]),
  releaseId: z.string().min(1),
  recipient: z.string().email(),
  templates: z.object({
    diagnostic: z.string().min(1),
    release: z.string().min(1),
    rollback: z.string().min(1)
  }),
  buildUrl: z.string().url().optional(),
  summary: z.string().min(1).optional()
});

export type LifecycleInput = z.infer<typeof lifecycleInput>;

export function chooseLifecycleTemplate(input: LifecycleInput) {
  if (input.event === "build.failed") {
    return { templateId: input.templates.diagnostic, subject: `Build needs attention: ${input.releaseId}` };
  }
  if (input.event === "release.rolled_back") {
    return { templateId: input.templates.rollback, subject: `Release rolled back: ${input.releaseId}` };
  }
  return { templateId: input.templates.release, subject: `Release published: ${input.releaseId}` };
}

export async function deliverLifecycleMail(rawInput: unknown) {
  const input = lifecycleInput.parse(rawInput);
  const selected = chooseLifecycleTemplate(input);
  const message = await infrai.email.send({
    to: input.recipient,
    subject: selected.subject,
    template_id: selected.templateId,
    template_vars: {
      release_id: input.releaseId,
      event: input.event,
      build_url: input.buildUrl ?? "",
      summary: input.summary ?? ""
    },
    idempotency_key: `lifecycle-mail:${input.event}:${input.releaseId}`
  });
  return { messageId: message.message_id, templateId: selected.templateId, event: input.event };
}
