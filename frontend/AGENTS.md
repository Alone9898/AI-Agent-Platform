# Frontend Design Rules

## Product Character

- Treat this application as a local desktop productivity tool for managing Agents, Skills, Models, and conversations.
- Favor calm, practical, authored interfaces over marketing-page styling or generic SaaS dashboards.
- Make frequent operations obvious and efficient. Let information hierarchy create the visual interest.
- Use Chinese as the primary interface language. Add English only when it is established product terminology such as Agent, Skill, Model, API, or provider names.

## Before Editing

- Inspect the affected page, its neighboring pages, and the shared styles in `src/App.vue` before choosing a visual direction.
- Identify the page's primary task, secondary actions, expected information density, and empty/loading/error states.
- Preserve routes, stores, API calls, persistence, validation, events, and other business behavior unless the user explicitly requests logic changes.
- Prefer extending the existing visual system over inventing an isolated style for one page.
- Keep changes focused. Do not redesign unrelated pages while implementing a specific request.

## Visual Direction

- Use neutral surfaces, clear typography, restrained borders, and one primary accent color.
- Prefer solid colors. Reserve gradients for a small brand mark or a specific data visualization that benefits from them.
- Use spacing and alignment before adding containers, shadows, separators, or decoration.
- Keep information-dense management pages compact enough for desktop use without feeling cramped.
- Use an 8px spacing rhythm where practical, with 4px adjustments for compact controls.
- Default corner radii to 6-10px for controls and 10-14px for major surfaces. Avoid making every element rounded.
- Use shadows only to communicate elevation. Keep them subtle and avoid stacking several shadowed surfaces.
- Use semantic colors only for real states such as success, warning, error, active, or disabled.

## Avoid Generic AI Styling

- Do not use decorative purple gradients as the default page background or primary button treatment.
- Do not add glassmorphism, backdrop blur, glowing blobs, ambient halos, floating circles, decorative grids, orbit graphics, or luminous status dots without a concrete product reason.
- Do not add uppercase English eyebrow labels such as `LOCAL WORKSPACE`, `WELCOME BACK`, or `ACTIVE CONVERSATION` merely as decoration.
- Do not fill empty space with fake metrics, fake runtime states, decorative badges, or non-functional controls.
- Do not nest multiple rounded cards when grouping can be expressed with spacing, typography, or a single divider.
- Do not apply hover translation to every card or button. Use restrained color, border, or shadow feedback.
- Do not use generic AI copy such as “未来工作台”, “智能新体验”, or “释放无限可能”. Write copy that describes the actual task.
- Do not make every page look like the same centered SaaS template. Let its workflow determine the layout.

## Components and Layout

- Reuse Element Plus components for inputs, menus, dialogs, tables, loading, and feedback instead of recreating their behavior.
- Keep shared design tokens and broad component overrides in `src/App.vue`; keep page-specific styles beside the page or component.
- Avoid broad global selectors that accidentally restyle unrelated views.
- Ensure layouts remain usable at common desktop window sizes, including 1280x720 and narrower windows around 960x640.
- Prevent horizontal overflow, clipped dialogs, inaccessible actions, and scroll areas competing with the application shell.
- Keep focus states visible and preserve keyboard behavior.
- Respect `prefers-reduced-motion` when introducing meaningful animation.
- Do not add external fonts, images, icon packages, or network-loaded assets without user approval.

## Implementation Workflow

1. Read the relevant templates, scripts, styles, and shared shell.
2. State the intended information hierarchy and visual direction in plain language.
3. Implement the smallest coherent change that achieves the design goal.
4. Verify that business scripts are unchanged when the task is visual-only; icon imports and presentation-only computed values are acceptable when necessary.
5. Run the narrowest relevant type check or production build.
6. When a browser is available, inspect the real page at desktop and narrow sizes and check focus, scrolling, empty states, loading states, and long content.
7. If browser validation is unavailable, report that explicitly instead of claiming screenshot-level verification.

## Review Checklist

- Does the page look like a real desktop product rather than a generated landing page?
- Is the primary task obvious within a few seconds?
- Can any decorative element be removed without losing meaning? If yes, remove it.
- Are color, radius, shadow, and typography consistent with adjacent pages?
- Are all visible states based on real application data?
- Is the interface still clear with realistic long names, descriptions, and empty data?
- Did the change preserve existing behavior and accessibility?
