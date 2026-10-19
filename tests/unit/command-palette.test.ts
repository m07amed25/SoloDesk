import test from "node:test";
import assert from "node:assert/strict";
import {
  filterActions,
  type CommandPaletteAction,
} from "../../app/renderer/lib/command-registry.ts";

test("filters actions correctly based on query and keywords", () => {
  const actions: CommandPaletteAction[] = [
    {
      id: "nav-overview",
      category: "navigation",
      titleKey: "nav.overview",
      titleText: "Overview",
      keywords: ["dashboard", "home", "نظرة عامة"],
      iconName: "LayoutDashboard",
      execute: () => {},
      enabled: true,
    },
    {
      id: "nav-projects",
      category: "navigation",
      titleKey: "nav.projects",
      titleText: "Projects",
      keywords: ["tasks", "مشاريع", "عمل"],
      iconName: "FolderKanban",
      execute: () => {},
      enabled: true,
    },
    {
      id: "pref-theme",
      category: "preferences",
      titleKey: "theme.toggle",
      titleText: "Toggle Theme",
      keywords: ["dark", "light", "مظهر", "داكن", "فاتح"],
      iconName: "SunMoon",
      execute: () => {},
      enabled: true,
    },
  ];

  // Search by English title
  const res1 = filterActions(actions, "proj");
  assert.equal(res1.length, 1);
  assert.equal(res1[0].id, "nav-projects");

  // Search by Arabic keyword
  const res2 = filterActions(actions, "نظره");
  assert.equal(res2.length, 1);
  assert.equal(res2[0].id, "nav-overview");

  // Empty query returns all enabled actions
  const resAll = filterActions(actions, "");
  assert.equal(resAll.length, 3);
});

test("filters 100 actions in under 50ms", () => {
  const actions: CommandPaletteAction[] = [];
  for (let i = 0; i < 100; i++) {
    actions.push({
      id: `action-${i}`,
      category:
        i % 3 === 0 ? "navigation" : i % 3 === 1 ? "actions" : "preferences",
      titleKey: `action.${i}`,
      titleText: `Action Number ${i} Item Details`,
      keywords: [`keyword-${i}`, "مشروع", "فاتورة", "إعدادات", `code-${i}`],
      iconName: "Activity",
      execute: () => {},
      enabled: true,
    });
  }

  const start = performance.now();
  const results = filterActions(actions, "اعدادات");
  const elapsed = performance.now() - start;

  assert.ok(
    elapsed < 50,
    `Filtering execution must be under 50ms, took ${elapsed.toFixed(2)}ms`,
  );
  assert.equal(results.length, 100);
});
