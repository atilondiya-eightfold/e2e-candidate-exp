/**
 * Centralized copy for candidate-prep. Plain strings today; trivial to
 * migrate to i18next translation keys later (CLAUDE.md NFR-6).
 *
 * Tone rule (NFR-2): suggestive, never aggressive. No "you must" /
 * "required" / "important". Use "Optional", "Suggested", "Recommended".
 */

export const emptyStateStrings = {
	pageTitle: "Applications",
	application: {
		viewLabel: "View",
		appliedPrefix: "Applied",
	},
	timeline: {
		stages: [
			"Application",
			"Recruiter conversation",
			"Technical screen",
			"Full loop interview",
			"Team matching",
			"Decision",
		] as const,
	},
	prepHeading: "Optional prep for your technical screen",
	prepFraming:
		"We've put together a few things you might find useful before your screen with Aditi on Apr 13. None of this is required — it's available if you want it. Most candidates spend 30–60 min total.",
	cards: {
		gapReport: {
			icon: "📊",
			title: "See where your profile maps",
			body: "We compare your experience against this role and surface the 2–4 areas most likely to come up. Takes about 2 minutes — nothing to do, just read.",
			cta: "Generate my gap report →",
			helpfulWhen: "💡 Helpful if you're not sure what to brush up on.",
		},
		mock: {
			icon: "🎤",
			title: "Practice with an adaptive mock",
			body: "25-min voice session with our AI coach Mira. She adapts the questions to your answers — if you nail a topic she moves on, if you stumble she digs in. Just like a real screen.",
			cta: "Start a mock →",
			helpfulWhen: "💡 Most useful in the last week before your screen.",
		},
		study: {
			icon: "📚",
			title: "Curated study material",
			body: "Hand-picked articles, videos and book chapters focused on the dimensions that matter for this role. Opens on the publisher's site — we just point you to the good stuff.",
			cta: "Browse resources →",
			helpfulWhen: "💡 Better after your gap report — we'll tailor it.",
		},
	},
	privacy: {
		icon: "ℹ️",
		leadIn: "A note from the team:",
		body: "Candidates who do any one of these activities tend to feel more confident going into the screen — not because we're grading you here, but because surfacing the unknowns ahead of time means fewer surprises in the actual interview. Use what's helpful, skip what isn't.",
	},
} as const;
