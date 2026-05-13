import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactElement } from "react";

import { ErrorPanel } from "../components/ErrorPanel";
import { PillButton } from "../components/PillButton";
import { TopNav } from "../components/TopNav";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
	mockId: string;
}

type Phase = "in_progress" | "dropped" | "processing";

export function MockActivePage({ applicationId, mockId }: Props): ReactElement {
	const navigate = useNavigate();
	const demoState = usePrepDemoStore((s) => s.state);
	const [phase, setPhase] = useState<Phase>("in_progress");
	const [elapsedSec, setElapsedSec] = useState(0);

	useEffect(() => {
		if (phase !== "in_progress") return;
		const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
		return () => window.clearInterval(t);
	}, [phase]);

	useEffect(() => {
		if (phase !== "processing") return;
		const t = window.setTimeout(() => {
			navigate({
				to: "/prep/$applicationId/mock/$mockId/feedback",
				params: { applicationId, mockId },
			});
		}, 2200);
		return () => window.clearTimeout(t);
	}, [phase, navigate, applicationId, mockId]);

	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });

	const endMock = () => {
		// Demo: if dev toolbar is in "error" mode, show dropped-mid-call state.
		if (demoState === "error") {
			setPhase("dropped");
		} else {
			setPhase("processing");
		}
	};

	const fmtElapsed = (sec: number) => {
		const m = Math.floor(sec / 60)
			.toString()
			.padStart(2, "0");
		const s = (sec % 60).toString().padStart(2, "0");
		return `${m}:${s}`;
	};

	return (
		<div className="bg-white min-h-screen">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-16">
				{phase === "in_progress" && (
					<>
						<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f3ff] text-[28px]">
							🎤
						</div>
						<h1 className="text-[22px] font-semibold text-[#080809]">
							{strings.mockActive.titleActive}
						</h1>
						<p className="mt-2 text-[13px] text-[#65676b]">
							The conversation is happening in a separate tab. We'll bring
							you back here when it ends.
						</p>
						<div className="mx-auto mt-7 max-w-xs rounded-xl border border-[#e4e6eb] bg-[#f7f8fa] px-5 py-4">
							<div className="text-[10.5px] font-bold tracking-wider text-[#65676b]">
								{strings.mockActive.elapsedLabel}
							</div>
							<div className="font-mono text-[22px] font-semibold text-[#080809]">
								{fmtElapsed(elapsedSec)}
							</div>
						</div>
						<div className="mt-8 flex justify-center gap-3">
							<PillButton variant="secondary" onClick={backToHub}>
								Back to hub
							</PillButton>
							<PillButton variant="primary" onClick={endMock}>
								{strings.mockActive.endMock}
							</PillButton>
						</div>
					</>
				)}

				{phase === "processing" && (
					<>
						<div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e7f3ff] border-t-[#1877f2]" />
						<h1 className="text-[20px] font-semibold text-[#080809]">
							{strings.mockActive.processingTitle}
						</h1>
						<p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.55] text-[#65676b]">
							{strings.mockActive.processingBody}
						</p>
					</>
				)}

				{phase === "dropped" && (
					<div className="text-left">
						<ErrorPanel
							tone="amber"
							icon="⏸"
							title={strings.errors.mockDropped.title}
							body={strings.errors.mockDropped.body}
							actions={[
								{
									label: strings.errors.mockDropped.score,
									onClick: () => setPhase("processing"),
									variant: "primary",
								},
								{
									label: strings.errors.mockDropped.discard,
									onClick: backToHub,
									variant: "secondary",
								},
							]}
							footer={strings.errors.mockDropped.footer}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
