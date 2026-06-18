# Agricultural Vision Mind — Codex Guidelines

## Design Context

### Users

**Who they are:** Two equally important audiences — smallholder farmers (often mobile, field context, Arabic or English, varying tech literacy) and professional agronomists/experts (desktop-first, data-dense, power-users). Both groups depend on the platform for consequential decisions about crops, health, and livelihood.

**Job to be done:**
- Farmers: Quickly diagnose a plant problem, get actionable guidance, track farm health without friction.
- Agronomists: Analyze data, manage multiple farms, collaborate, and access advanced AI insights.

**Emotional context:** Users may be stressed (crop disease, weather events). The interface must inspire confidence and calm, never overwhelm.

### Brand Personality

**Three words:** Trustworthy, Modern, Calm

**Voice & tone:** Knowledgeable but approachable. Like a trusted agricultural advisor who speaks plainly, respects the farmer's expertise, and delivers information with quiet confidence. Never clinical or cold. Never overly casual.

**Emotional goals:** Confidence ("I can trust what this app tells me"), Calm ("Even in a crisis, this interface doesn't panic me"), Capability ("This tool understands farming").

### Aesthetic Direction

**Direction: Organic / Nature-First**

The visual language is rooted in the natural world — soft, rounded forms that echo leaves, soil, and growth. Earthy greens and warm browns dominate. Avoid cold tech aesthetics (pure blues, sharp geometric grids, dark-mode-first chrome).

**Anti-references:** Generic SaaS dashboards, aggressive AI/neon aesthetics, overly playful consumer-app feel.

**Theme:** Both light and dark modes fully supported. Light mode is primary — warm white backgrounds with green/earth tones. Dark mode uses deep forest/earth darks (not pure gray or blue-black).

### Accessibility

**Target:** WCAG 2.1 AAA — minimum 7:1 contrast ratio for normal text.

- Full RTL (Arabic) support — Arabic and English are equal citizens
- All animations must respect `prefers-reduced-motion`
- Color must never be the sole differentiator
- Touch targets: minimum 44×44px

### Design Principles

1. **Land before interface** — Every surface should feel agricultural, not generic SaaS.
2. **Calm under pressure** — Scannable layouts, obvious actions, proportional alerts. Never add visual noise to a stressed workflow.
3. **Bilingual by default** — Test every design decision in both Arabic (RTL) and English (LTR).
4. **Accessible always** — WCAG AAA is the floor. Contrast, focus states, motion, and touch targets are non-negotiable.
5. **Warmth over chrome** — Earthy, warm, organic surfaces over cold glass and neon. The interface should reflect the relationship with the earth.
