import assert from "node:assert/strict";
import test from "node:test";
import { chooseLifecycleTemplate } from "../src/lifecycle_mail.ts";

const templates = { diagnostic: "tpl-diagnostic", release: "tpl-release", rollback: "tpl-rollback" };

test("a rollback selects the rollback template instead of the release announcement", () => {
  const selected = chooseLifecycleTemplate({
    event: "release.rolled_back",
    releaseId: "r-42",
    recipient: "dev@example.test",
    templates
  });

  assert.equal(selected.templateId, "tpl-rollback");
  assert.match(selected.subject, /rolled back/);
});
