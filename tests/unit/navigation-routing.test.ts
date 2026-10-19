import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUTES,
  getRouteDefinition,
  computeBreadcrumbs,
  type RouteId,
} from "../../app/renderer/lib/routes.ts";

test("registry contains exactly 9 canonical routes with ordered sequence", () => {
  assert.equal(ROUTES.length, 9);
  const routeIds = ROUTES.map((r) => r.id);
  assert.deepEqual(routeIds, [
    "overview",
    "my-work",
    "projects",
    "clients",
    "time",
    "finance",
    "reports",
    "knowledge",
    "settings",
  ]);

  for (let i = 0; i < ROUTES.length; i++) {
    assert.equal(ROUTES[i].order, i + 1);
  }
});

test("route definitions distinguish active routes from honest placeholders", () => {
  const overview = getRouteDefinition("overview");
  assert.ok(overview);
  assert.equal(overview.status, "active");

  const settings = getRouteDefinition("settings");
  assert.ok(settings);
  assert.equal(settings.status, "active");

  const finance = getRouteDefinition("finance");
  assert.ok(finance);
  assert.equal(finance.status, "placeholder");
  assert.equal(finance.targetPhase, "F042");
});

test("computes breadcrumbs hierarchy for active route", () => {
  // Overview breadcrumbs
  const overviewCrumbs = computeBreadcrumbs("overview");
  assert.equal(overviewCrumbs.length, 1);
  assert.equal(overviewCrumbs[0].routeId, "overview");
  assert.equal(overviewCrumbs[0].isCurrent, true);

  // Sub-route breadcrumbs (e.g. projects)
  const projectsCrumbs = computeBreadcrumbs("projects");
  assert.equal(projectsCrumbs.length, 2);
  assert.equal(projectsCrumbs[0].routeId, "overview");
  assert.equal(projectsCrumbs[0].isCurrent, false);
  assert.equal(projectsCrumbs[1].routeId, "projects");
  assert.equal(projectsCrumbs[1].isCurrent, true);
});
