/**
 * Centralized copy for candidate-prep. Plain strings today; trivial to
 * migrate to i18next translation keys later (CLAUDE.md NFR-6).
 *
 * Tone rule (NFR-2): suggestive, never aggressive. No "you must" /
 * "required" / "important". Use "Optional", "Suggested", "Recommended".
 */

export const strings = {
	brand: {
		wordmark: "∞ Eightfold Prep",
		navApplications: "Applications",
		navResources: "Resources",
	},
	privacy: {
		icon: "ℹ️",
		leadIn: "A note from the team:",
		emptyBody:
			"Candidates who do any one of these activities tend to feel more confident going into the screen — not because we're grading you here, but because surfacing the unknowns ahead of time means fewer surprises in the actual interview. Use what's helpful, skip what isn't.",
		hubBody:
			"None of this is shared with the interviewer or recruiter. Practice scores, transcripts, and study progress are visible only to you.",
	},
	empty: {
		pageTitle: "Applications",
		application: {
			viewLabel: "View",
			appliedPrefix: "Applied",
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
	},
	hub: {
		breadcrumb: {
			applications: "Applications",
			separator: "›",
		},
		stage: {
			title: "Technical screen with Aditi · Mon Apr 13 · 7:00 PM IST",
			meta: "12 days away · 30–60 min · system design focus",
			aboutLabel: "About this stage",
			joinMeeting: "Join meeting",
			hide: "Hide ▴",
			show: "Show ▾",
			aboutHeading: "About the Technical screen stage",
			columns: {
				expect: {
					title: "WHAT TO EXPECT",
					body: "A 30–60 min conversation with a Google engineer. System design focus, may include a coding warmup. Adaptive — they go deeper on areas you sound strong in.",
				},
				evaluated: {
					title: "HOW IT'S EVALUATED",
					body: "Four dimensions: scaling tradeoffs, data modeling, consistency/CAP, and how structured your answers are. Each rated weak / partial / solid / strong.",
				},
				questions: {
					title: "HAVE QUESTIONS?",
					body: "Your recruiter is the right person. Reach out via PCS messages — they usually reply same day.",
				},
			},
		},
		prepHeading: "Prep activities",
		prepFraming:
			"Continue where you left off, or jump into something new. Spend as much or as little time as you like.",
		suggested: {
			eyebrow: "SUGGESTED NEXT · 25 MIN",
			title: "Run a focused mock on consistency & failure modes",
			body: "Builds on your last mock score of 62 — these two dimensions need the most work.",
			cta: "Start mock →",
		},
		tiles: {
			gap: { eyebrow: "GAP REPORT", view: "View →" },
			mocks: { eyebrow: "MOCK HISTORY", view: "All →" },
			study: { eyebrow: "STUDY PLAN", view: "Open →" },
			readiness: {
				eyebrow: "READINESS",
				view: "Why →",
				explanation:
					"Estimated from your gap report, mock score & study-plan progress. Most candidates aim for 80%+ before their screen.",
			},
		},
	},
	gapReport: {
		title: "Where your profile maps against this role",
		subtitle:
			"Based on your experience vs. what this role typically expects. Ranked by how much each gap would matter in an interview.",
		severity: {
			high: "High",
			medium: "Medium",
			covered: "Already covered",
			highVerbose: "high gaps",
			mediumVerbose: "medium gaps",
			coveredVerbose: "areas already strong",
		},
		topicsHeading: "Widest gaps — topics to study",
		topicHint: "Topic chips are a vocabulary cue. They become clickable on your study plan.",
		ctas: {
			mock: "🎤 Mock these →",
			study: "📚 Study plan",
		},
	},
	mockLaunch: {
		breadcrumb: "Adaptive mock",
		title: "Mock #2 — Consistency & failure modes",
		subtitle: "Voice only · 25 min · adapts as you talk",
		meeting: {
			heading: "Meeting with Mira (Eightfold AI Coach)",
			idLabel: "Meeting ID:",
			passcodeLabel: "Passcode:",
			hostedLabel: "Hosted on:",
			hostNote: "LiveKit · opens in a new tab",
			join: "📹 Join meeting",
			testMic: "🎤 Test mic first",
		},
		tipsHeading: "BEFORE YOU JOIN",
		tips: [
			"🎧 Use headphones — the agent can hear your speaker echo otherwise.",
			"🤫 Find a quiet room — background voices confuse the agent.",
			"⏱️ Plan for ~25 min uninterrupted — pausing mid-call ends the mock.",
			"🧠 Think out loud — the agent only scores what you actually say.",
		],
		askedHeading: "WHAT YOU'LL BE ASKED",
		askedFraming:
			"Mira will start with a system-design prompt, then dig deeper based on your answers. Focus topics for this mock (from your gap report):",
	},
	mockActive: {
		titleActive: "Mock #2 — in progress",
		elapsedLabel: "Elapsed:",
		endMock: "End mock",
		processingTitle: "Mira is reviewing your interview",
		processingBody:
			"Usually takes 30–60 seconds. We'll bring you straight to the feedback when it's ready.",
	},
	mockFeedback: {
		mockEyebrow: "MOCK #2 · 24 MIN · APR 8",
		mockTitle: "Consistency & failure modes",
		deltaPrefix: "↑",
		deltaSuffix: "from #1",
		miraHeading: "Mira's review",
		miraSubheading: "Mock #2 · 24 min · Apr 8",
		dimensionsEyebrow: "DIMENSION SCORES",
		momentsEyebrow: "MOMENTS THAT MOVED YOUR SCORE",
		ctas: {
			study: "📚 Updated study plan →",
			transcript: "📝 Replay transcript",
		},
	},
	studyPlan: {
		title: "Your study plan",
		subtitleSuffix: "remaining",
		progressLabel: "complete",
		upNextEyebrow: "UP NEXT",
		resume: "Resume →",
		mockThis: "🎤 Mock this →",
		sectionMetaSuffix: "done",
		collapsedNote: "show ▾",
		expandedNote: "hide ▴",
	},
	transcript: {
		title: "Transcript — Mock #2",
		subtitle:
			"Full record of the conversation. Strong and weak moments are highlighted inline.",
		backToFeedback: "← Back to feedback",
		agent: "Mira",
		you: "You",
	},
	errors: {
		genericTitle: "We hit a snag",
		genericBody:
			"Something unexpected happened. We've logged it on our side. You can head back to your application and try again — nothing you've done so far is lost.",
		offlineBanner:
			"⚡ You're offline. Some data may be out of date. We'll reconnect automatically.",
		retryNow: "Retry now",
		backToHub: "Back to hub",
		refresh: "Refresh page",
		gapReport: {
			title: "We couldn't generate your gap report",
			body: "Something went wrong while comparing your profile to the role. This usually clears up if you try again in a minute. If it keeps happening, the issue is on our side — not anything you did.",
			retry: "Try again",
		},
		mockConnect: {
			title: "We couldn't connect to the interview room",
			body: "The meeting service didn't respond. Two things usually fix this:",
			bullets: [
				"Check your internet — voice needs a stable connection.",
				"Try again in a few seconds.",
			],
			retry: "Rejoin meeting",
			alt: "Reschedule mock",
			footer:
				"Your mock attempt count isn't affected. This doesn't show up on your record.",
		},
		mockDropped: {
			title: "Your mock ended early",
			body: "Looks like the call disconnected after 8 minutes. We can still score what we have, but the feedback will be limited — only one or two dimensions had enough material.",
			score: "Score what we have",
			discard: "Discard & retry",
			footer:
				"If you discard, this attempt won't appear in your mock history.",
		},
		referenceLabel: "Reference:",
		referenceSupport: "— share this with support if it persists.",
	},
	common: {
		backToHubLink: "← Back to hub",
		back: "← Back",
	},
} as const;
