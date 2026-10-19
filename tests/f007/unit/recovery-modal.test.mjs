import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformWithOxc } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { recoveryStatus } from "../../../app/main/persistence/recovery-state.ts";
import { wrappedFocusIndex } from "../../../app/renderer/shell/recovery-focus.ts";

async function renderModal(locale) {
  const source = readFileSync("app/renderer/shell/PersistenceRecoveryModal.tsx", "utf8");
  const transformed = await transformWithOxc(source, "app/renderer/shell/PersistenceRecoveryModal.tsx");
  const js = transformed.code.replace(/^import .*;\s*$/gm, "").replace("export function PersistenceRecoveryModal", "function PersistenceRecoveryModal");
  const context = {
    React,
    Button: (props) => React.createElement("button", props),
    wrappedFocusIndex,
    _jsx: requireActual("react/jsx-runtime").jsx,
    _jsxs: requireActual("react/jsx-runtime").jsxs,
    document: undefined,
  };
  const component = vm.runInNewContext(`${js}\nPersistenceRecoveryModal`, context);
  return renderToStaticMarkup(React.createElement(component, {
    state: recoveryStatus("ws-test-alpha", "disk_full"), locale, busy: false,
    onRetry() {}, onQuit() {},
  }));
}

import { createRequire } from "node:module";
const requireActual = createRequire(import.meta.url);

test("recovery dialog has bilingual descriptions, modal semantics and native keyboard actions", async () => {
  for (const locale of ["en", "ar"]) {
    const markup = await renderModal(locale);
    assert.match(markup, /role="alertdialog"/);
    assert.match(markup, /aria-modal="true"/);
    assert.match(markup, /aria-labelledby="persistence-recovery-title"/);
    assert.match(markup, /aria-describedby="persistence-recovery-description"/);
    assert.match(markup, /<button/g);
    assert.equal((markup.match(/<button/g) ?? []).length, 2);
    assert.match(markup, locale === "ar" ? /dir="rtl"/ : /dir="ltr"/);
    assert.match(markup, locale === "ar" ? /المسودات المحلية غير المتزامنة/ : /Unsynced local drafts/);
  }
  assert.equal(wrappedFocusIndex(0, 2, true), 1);
  assert.equal(wrappedFocusIndex(1, 2, false), 0);
  assert.equal(wrappedFocusIndex(0, 2, false), null);
});
