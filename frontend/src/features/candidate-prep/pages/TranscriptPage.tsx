import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { TopNav } from "../components/TopNav";
import { useMockTranscript } from "../hooks";
import { transcriptByMock, type TranscriptTurn } from "../mocks/data";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
	mockId: string;
}

export function TranscriptPage({ applicationId, mockId }: Props): ReactElement {
	const navigate = useNavigate();
	const demoState = usePrepDemoStore((st) => st.state);
	const apiQ = useMockTranscript(demoState === "populated" ? mockId : undefined);
	const turns: TranscriptTurn[] = apiQ.data
		? apiQ.data.turns.map((t) => ({
				id: t.id,
				speaker: t.speaker,
				timestamp: t.timestamp,
				text: t.text,
				highlight: t.highlight ?? undefined,
			}))
		: (transcriptByMock[mockId] ?? transcriptByMock["mock_2"] ?? []);
	const s = strings.transcript;

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-3xl px-4 py-8 sm:px-10 sm:py-10">
				<button
					type="button"
					onClick={() =>
						navigate({
							to: "/prep/$applicationId/mock/$mockId/feedback",
							params: { applicationId, mockId },
						})
					}
					className="mb-3 text-[12px] text-[#1877f2] hover:underline"
				>
					{s.backToFeedback}
				</button>
				<h1 className="text-[22px] font-bold text-[#080809]">{s.title}</h1>
				<p className="mt-1.5 mb-6 text-[13px] text-[#65676b]">{s.subtitle}</p>

				<ol className="space-y-3.5">
					{turns.map((t) => {
						const isAgent = t.speaker === "agent";
						const highlightBg =
							t.highlight === "strong"
								? "#f0fdf4"
								: t.highlight === "weak"
									? "#fffbeb"
									: undefined;
						const highlightBorder =
							t.highlight === "strong"
								? "#16a34a"
								: t.highlight === "weak"
									? "#d97706"
									: undefined;
						return (
							<li
								key={t.id}
								className="rounded-xl border px-4 py-3"
								style={{
									borderColor: highlightBorder ?? "#e5e7eb",
									background: highlightBg ?? "#fff",
								}}
							>
								<div className="mb-1 flex items-center justify-between text-[10.5px] text-[#65676b]">
									<span className="font-bold text-[#1f3a68]">
										{isAgent ? s.agent : s.you}
									</span>
									<span className="font-mono">{t.timestamp}</span>
								</div>
								<p className="text-[13px] leading-[1.55] text-[#374151]">
									{t.text}
								</p>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
