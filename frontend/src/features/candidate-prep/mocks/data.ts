/**
 * Deterministic mock fixtures for candidate-prep. Fixed IDs / dates so
 * screenshot diffs are stable. Replace with API hooks in ui-builder.
 */

export type TimelineStageStatus = "complete" | "current" | "upcoming";
export type GapSeverity = "high" | "medium" | "covered";
export type DimensionLevel = "weak" | "partial" | "solid" | "strong";

export interface TimelineStage {
	id?: string;
	label: string;
	status: TimelineStageStatus;
	focusSummary?: string | null;
	estimatedDurationLabel?: string | null;
	durationMin?: number | null;
	interviewerName?: string | null;
	interviewerTitle?: string | null;
	scheduledAt?: number | null;
}

export interface ApplicationSummary {
	id: string;
	roleTitle: string;
	appliedOn: string;
	location: string;
	stageTitle: string;
	stageMeta: string;
	timeline: TimelineStage[];
}

export interface TopicChip {
	id: string;
	label: string;
}

export interface GapDimension {
	id: string;
	name: string;
	severity: GapSeverity;
	rationale: string;
	studyTopics: TopicChip[];
}

export interface MockSummary {
	id: string;
	number: number;
	title: string;
	dateLabel: string;
	durationMin: number;
	score: number | null;
	status: "completed" | "scheduled" | "in_progress" | "discarded";
}

export interface DimensionScore {
	dimensionId: string;
	name: string;
	level: DimensionLevel;
	comment: string;
	studyTopics: TopicChip[];
}

export interface TranscriptMoment {
	id: string;
	timestamp: string;
	level: "strong" | "weak";
	quote: string;
	annotation?: string;
}

export interface MockFeedback {
	mockId: string;
	mockNumber: number;
	title: string;
	dateLabel: string;
	durationMin: number;
	score: number;
	delta: number;
	miraSummary: string;
	dimensions: DimensionScore[];
	moments: TranscriptMoment[];
}

export interface StudyResource {
	id: string;
	title: string;
	type: "read" | "video" | "book";
	durationMin: number;
	url: string;
	publisher?: string;
	done: boolean;
}

export interface StudySection {
	dimensionId: string;
	name: string;
	severity: GapSeverity;
	totalMin: number;
	completedCount: number;
	totalCount: number;
	studyTopics: TopicChip[];
	resources: StudyResource[];
	completed: boolean;
}

export interface TranscriptTurn {
	id: string;
	speaker: "agent" | "candidate";
	timestamp: string;
	text: string;
	highlight?: "strong" | "weak";
}

export interface StudyPlan {
	totalRemainingMin: number;
	completedCount: number;
	totalCount: number;
	upNext: { sectionId: string; resourceId: string } | null;
	sections: StudySection[];
}

export interface PrepState {
	application: ApplicationSummary;
	gap: {
		generated: boolean;
		generatedOn: string;
		dimensions: GapDimension[];
		counts: { high: number; medium: number; covered: number };
	} | null;
	mocks: MockSummary[];
	studyPlan: StudyPlan | null;
	readinessPct: number;
}

export const TYPE_ICONS: Record<StudyResource["type"], string> = {
	read: "📖",
	video: "🎬",
	book: "📚",
};

const application: ApplicationSummary = {
	id: "app_mock_01",
	roleTitle: "Staff Software Engineer · Distributed Systems",
	appliedOn: "Mar 9, 2026",
	location: "Bangalore, India",
	stageTitle: "Technical screen with Aditi · Mon Apr 13 · 7:00 PM IST",
	stageMeta: "12 days away · 30–60 min · system design focus",
	timeline: [
		{ label: "Application", status: "complete" },
		{ label: "Recruiter conversation", status: "complete" },
		{ label: "Technical screen", status: "current" },
		{ label: "Full loop interview", status: "upcoming" },
		{ label: "Team matching", status: "upcoming" },
		{ label: "Decision", status: "upcoming" },
	],
};

const consistencyChips: TopicChip[] = [
	{ id: "quorum-reads", label: "Quorum reads" },
	{ id: "read-your-writes", label: "Read-your-writes" },
	{ id: "vector-clocks", label: "Vector clocks" },
];

const failureChips: TopicChip[] = [
	{ id: "region-failover", label: "Region failover" },
	{ id: "graceful-degradation", label: "Graceful degradation" },
];

const scalingChips: TopicChip[] = [
	{ id: "hot-keys", label: "Hot-key sharding" },
	{ id: "partitioning", label: "Partitioning strategies" },
];

export const gapDimensions: GapDimension[] = [
	{
		id: "consistency",
		name: "Consistency / CAP",
		severity: "high",
		rationale:
			"You've worked with eventually-consistent systems but haven't named the tradeoffs explicitly in your projects.",
		studyTopics: consistencyChips,
	},
	{
		id: "failure-modes",
		name: "Failure modes",
		severity: "medium",
		rationale:
			"Standard hash partitioning visible in your work; multi-region failover patterns less common.",
		studyTopics: failureChips,
	},
	{
		id: "scaling",
		name: "Scaling tradeoffs",
		severity: "medium",
		rationale:
			"Your services are single-region today; Google's scale assumes multi-region by default.",
		studyTopics: scalingChips,
	},
	{
		id: "data-model",
		name: "Data modeling",
		severity: "covered",
		rationale: "Clear schema design and indexing visible across your last three projects.",
		studyTopics: [],
	},
];

const completedMocks: MockSummary[] = [
	{
		id: "mock_1",
		number: 1,
		title: "Scaling tradeoffs",
		dateLabel: "Apr 1",
		durationMin: 22,
		score: 48,
		status: "completed",
	},
	{
		id: "mock_2",
		number: 2,
		title: "Consistency & failure modes",
		dateLabel: "Apr 8",
		durationMin: 24,
		score: 62,
		status: "completed",
	},
];

export const mockFeedback: Record<string, MockFeedback> = {
	mock_2: {
		mockId: "mock_2",
		mockNumber: 2,
		title: "Consistency & failure modes",
		dateLabel: "Apr 8",
		durationMin: 24,
		score: 76,
		delta: 14,
		miraSummary:
			"Good session, Aarav. Your data modeling and scaling reasoning are sharp — you called out partition-by-hash without prompting. Where you lost points was consistency: you said “eventual is fine” without naming the failure mode someone would actually experience. Tighten that and you're at 85+.",
		dimensions: [
			{
				dimensionId: "scaling",
				name: "Scaling tradeoffs",
				level: "solid",
				comment:
					"You partitioned writes by hash and accepted regional ownership. Worth practicing hot-key scenarios next.",
				studyTopics: [],
			},
			{
				dimensionId: "consistency",
				name: "CAP / consistency",
				level: "partial",
				comment:
					"You picked eventual consistency but didn't tie it to a user-visible failure. Try naming “two regions create the same short code” next time.",
				studyTopics: consistencyChips,
			},
			{
				dimensionId: "data-model",
				name: "Data model",
				level: "strong",
				comment: "Clean entity boundaries, indexes called out without prompting.",
				studyTopics: [],
			},
			{
				dimensionId: "delivery",
				name: "Structured delivery",
				level: "solid",
				comment:
					"Clear sections, walked through requirements before diving in.",
				studyTopics: [],
			},
		],
		moments: [
			{
				id: "m1",
				timestamp: "04:12",
				level: "strong",
				quote:
					"...so for writes I'd partition by hash of the short code and accept regional ownership — that gives us no coordination on the write path...",
			},
			{
				id: "m2",
				timestamp: "11:34",
				level: "weak",
				quote: "...for consistency I think eventual works because…",
				annotation: "(no concrete failure mode named)",
			},
			{
				id: "m3",
				timestamp: "18:02",
				level: "strong",
				quote:
					"...the read path can be served from any region's replica, and we accept a few seconds of staleness on the click count...",
			},
		],
	},
};

export const transcriptByMock: Record<string, TranscriptTurn[]> = {
	mock_2: [
		{
			id: "t1",
			speaker: "agent",
			timestamp: "00:00",
			text: "Hey Aarav, today I'd like to walk through designing a URL shortener at Google scale. Take it from the top — how would you frame it?",
		},
		{
			id: "t2",
			speaker: "candidate",
			timestamp: "00:08",
			text: "Sure. I'd start by clarifying read-heavy vs write-heavy. For a shortener, reads dominate by 100:1 or more.",
		},
		{
			id: "t3",
			speaker: "agent",
			timestamp: "00:32",
			text: "Good. Now how would you partition the data?",
		},
		{
			id: "t4",
			speaker: "candidate",
			timestamp: "04:12",
			text: "...so for writes I'd partition by hash of the short code and accept regional ownership — that gives us no coordination on the write path...",
			highlight: "strong",
		},
		{
			id: "t5",
			speaker: "agent",
			timestamp: "10:54",
			text: "And consistency? What happens if two regions generate the same short code?",
		},
		{
			id: "t6",
			speaker: "candidate",
			timestamp: "11:34",
			text: "...for consistency I think eventual works because…",
			highlight: "weak",
		},
		{
			id: "t7",
			speaker: "agent",
			timestamp: "17:12",
			text: "Walk me through the read path under regional failover.",
		},
		{
			id: "t8",
			speaker: "candidate",
			timestamp: "18:02",
			text: "...the read path can be served from any region's replica, and we accept a few seconds of staleness on the click count...",
			highlight: "strong",
		},
	],
};

const consistencyResources: StudyResource[] = [
	{
		id: "res_jepsen_consistency",
		title: "Jepsen — Consistency Models",
		type: "read",
		durationMin: 20,
		url: "https://jepsen.io/consistency",
		publisher: "jepsen.io",
		done: false,
	},
	{
		id: "res_kleppmann_cp_ap",
		title: "Kleppmann — please stop calling DBs CP or AP",
		type: "read",
		durationMin: 15,
		url: "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html",
		publisher: "martin.kleppmann.com",
		done: false,
	},
	{
		id: "res_ddia_ch9",
		title: "DDIA — Chapter 9 (Consistency & Consensus)",
		type: "book",
		durationMin: 90,
		url: "https://dataintensive.net/",
		publisher: "Designing Data-Intensive Applications",
		done: false,
	},
];

const failureResources: StudyResource[] = [
	{
		id: "res_techdummies_sd",
		title: "Tech Dummies — How to tackle SD interviews",
		type: "video",
		durationMin: 20,
		url: "https://www.youtube.com/results?search_query=tech+dummies+system+design",
		publisher: "YouTube",
		done: false,
	},
	{
		id: "res_sdp_approach",
		title: "System Design Primer — How to approach SD",
		type: "read",
		durationMin: 15,
		url: "https://github.com/donnemartin/system-design-primer",
		publisher: "GitHub",
		done: false,
	},
];

const scalingResources: StudyResource[] = [
	{
		id: "res_sdp_scalability",
		title: "System Design Primer — Scalability",
		type: "read",
		durationMin: 25,
		url: "https://github.com/donnemartin/system-design-primer#scalability",
		publisher: "GitHub",
		done: true,
	},
	{
		id: "res_cs50_scalability",
		title: "Scalability — Harvard CS50 lecture",
		type: "video",
		durationMin: 47,
		url: "https://www.youtube.com/watch?v=-W9F__D3oY4",
		publisher: "YouTube",
		done: true,
	},
	{
		id: "res_sdp_database",
		title: "SDP — Database section",
		type: "read",
		durationMin: 30,
		url: "https://github.com/donnemartin/system-design-primer#database",
		publisher: "GitHub",
		done: true,
	},
];

const studySections: StudySection[] = [
	{
		dimensionId: "consistency",
		name: "CAP / consistency",
		severity: "high",
		totalMin: 125,
		completedCount: 0,
		totalCount: 3,
		studyTopics: consistencyChips,
		resources: consistencyResources,
		completed: false,
	},
	{
		dimensionId: "failure-modes",
		name: "Failure modes",
		severity: "medium",
		totalMin: 35,
		completedCount: 0,
		totalCount: 2,
		studyTopics: failureChips,
		resources: failureResources,
		completed: false,
	},
	{
		dimensionId: "scaling",
		name: "Scaling tradeoffs & Data model",
		severity: "covered",
		totalMin: 102,
		completedCount: 3,
		totalCount: 3,
		studyTopics: scalingChips,
		resources: scalingResources,
		completed: true,
	},
];

export const populatedState: PrepState = {
	application,
	gap: {
		generated: true,
		generatedOn: "Apr 6, 2026",
		dimensions: gapDimensions,
		counts: { high: 1, medium: 2, covered: 1 },
	},
	mocks: completedMocks,
	studyPlan: {
		totalRemainingMin: 240,
		completedCount: 3,
		totalCount: 7,
		upNext: { resourceId: "res_jepsen_consistency", sectionId: "consistency" },
		sections: studySections,
	},
	readinessPct: 62,
};

export const emptyState: PrepState = {
	application,
	gap: null,
	mocks: [],
	studyPlan: null,
	readinessPct: 0,
};

export const meetingDetails = {
	meetingId: "91752070224",
	passcode: "657517",
	host: "LiveKit",
	url: "https://meet.livekit.io/?room=ef-mock-2&user=aarav",
};

export const focusChipsByMock: Record<string, { focus: TopicChip[]; review: TopicChip[] }> = {
	mock_2: {
		focus: [
			{ id: "consistency", label: "Consistency / CAP" },
			{ id: "failure-modes", label: "Failure modes" },
		],
		review: [{ id: "scaling-review", label: "Scaling tradeoffs (review)" }],
	},
};
