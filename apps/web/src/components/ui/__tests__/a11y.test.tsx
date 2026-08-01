// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/ErrorState";

// "region" expects all page content inside landmarks (<main>, <nav>, …) — a
// page-level concern an isolated component render can't satisfy. "color-contrast"
// needs real rendering; jsdom has no layout/canvas, so it must be checked in a
// browser (WAVE, Lighthouse, or a Playwright axe scan).
const componentRules = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

afterEach(cleanup);

describe("shared UI primitives have no axe violations", () => {
  it("Modal", async () => {
    const { baseElement } = render(
      <Modal title="Delete assignment" onClose={() => {}}>
        <p>This cannot be undone.</p>
      </Modal>
    );
    // Modal renders into document.body via a portal, so scan baseElement.
    expect(await axe(baseElement, componentRules)).toHaveNoViolations();
  });

  it("ErrorState with retry", async () => {
    const { container } = render(
      <ErrorState message="Could not load courses." onRetry={() => {}} />
    );
    expect(await axe(container, componentRules)).toHaveNoViolations();
  });
});
