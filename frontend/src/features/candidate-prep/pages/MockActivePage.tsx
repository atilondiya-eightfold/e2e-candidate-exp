import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { useMockStatus } from "@/features/eightfold-api/hooks";

import { ErrorPanel } from "../components/ErrorPanel";
import { PillButton } from "../components/PillButton";
import { TopNav } from "../components/TopNav";
import { useLivekitMockRoom } from "../hooks/useLivekitMockRoom";
import {
	mockLivekitStorageKey,
	type MockLivekitStashed,
} from "./MockLaunchPage";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
	mockId: string;
}

// Phase drives the page UI. We keep this lightweight — most state lives in
// the LiveKit hook and the status query.
//   no-creds  → user landed on /active without going through launch (or hit refresh)
//   live      → in the room, conversation happening
//   processing → backend post-call pipeline is running, we're polling status
//   dropped   → connection dropped *after* we'd connected (real drop, not strict-mode noise)
//   ended     → terminal manual-end state
type Phase = "no-creds" | "live" | "ended" | "dropped" | "processing";

// Pull LiveKit creds stashed by MockLaunchPage. Returning null is fine —
// the user may have refreshed; we'll show the dropped panel.
function readStashedCreds(mockId: string): MockLivekitStashed | null {
	try {
		const raw = sessionStorage.getItem(mockLivekitStorageKey(mockId));
		if (!raw) return null;
		return JSON.parse(raw) as MockLivekitStashed;
	} catch {
		return null;
	}
}

export function MockActivePage({ applicationId, mockId }: Props): ReactElement {
	const navigate = useNavigate();
	const demoState = usePrepDemoStore((s) => s.state);

	// Read creds once (sessionStorage). useMemo so React doesn't re-parse on
	// every render and trip the hook's effect-deps comparison.
	const creds = useMemo(() => readStashedCreds(mockId), [mockId]);

	const {
		state: roomState,
		error: roomError,
		remoteParticipantCount,
		setMicEnabled,
		micEnabled,
		setCameraEnabled,
		cameraEnabled,
		localVideoTrack,
		disconnect,
	} = useLivekitMockRoom(creds);

	const [phase, setPhase] = useState<Phase>(creds ? "live" : "no-creds");
	const [elapsedSec, setElapsedSec] = useState(0);

	// Status polling kicks in once the user hangs up — we wait for the
	// upstream pipeline to mark the session "completed", then jump to feedback.
	const statusQuery = useMockStatus(mockId, {
		refetchInterval: phase === "processing" ? 4000 : false,
		enabled: phase === "processing",
	});

	// Live-call timer.
	useEffect(() => {
		if (phase !== "live") return;
		const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
		return () => window.clearInterval(t);
	}, [phase]);

	// Intentionally no auto-transition to "dropped" from roomState ===
	// "disconnected" — under React StrictMode the hook's effect re-runs in
	// dev and would briefly flicker "disconnected" before reconnecting. We
	// rely on the user clicking "End mock" (→ processing) or the demo
	// toolbar's error simulation to reach the dropped panel.

	// When the backend says the session is completed, navigate to feedback.
	useEffect(() => {
		if (phase !== "processing") return;
		if (statusQuery.data?.status === "completed") {
			navigate({
				to: "/prep/$applicationId/mock/$mockId/feedback",
				params: { applicationId, mockId },
			});
		}
	}, [phase, statusQuery.data?.status, navigate, applicationId, mockId]);

	// Attach the local video preview track to the <video> element.
	const videoRef = useRef<HTMLVideoElement | null>(null);
	useEffect(() => {
		const el = videoRef.current;
		if (!el || !localVideoTrack) return;
		localVideoTrack.attach(el);
		return () => {
			localVideoTrack.detach(el);
		};
	}, [localVideoTrack]);

	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });

	const endMock = async () => {
		if (demoState === "error") {
			setPhase("dropped");
			return;
		}
		await disconnect();
		// Backend takes ~30–90s to finish post-call scoring; show the
		// processing screen while we poll mock-status.
		setPhase("processing");
	};

	const fmtElapsed = (sec: number) => {
		const m = Math.floor(sec / 60)
			.toString()
			.padStart(2, "0");
		const s = (sec % 60).toString().padStart(2, "0");
		return `${m}:${s}`;
	};

	const agentLabel = (() => {
		if (roomState === "error") return "Connection failed";
		if (roomState === "connecting") return "Connecting to room…";
		if (remoteParticipantCount > 0) return "Mira is listening";
		return "Waiting for Mira to join…";
	})();

	return (
		<div className="bg-white min-h-screen">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
				{phase === "live" && (
					<div className="text-center">
						<div className="mb-4 text-[10.5px] font-bold tracking-wider text-[#65676b]">
							{strings.mockActive.titleActive.toUpperCase()}
						</div>

						{/* Agent orb */}
						<div
							className={`mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full text-[42px] ${
								remoteParticipantCount > 0
									? "bg-[#e7f3ff] animate-pulse"
									: "bg-[#f3f4f6]"
							}`}
						>
							🎤
						</div>
						<div className="mb-6 text-[13px] font-medium text-[#374151]">
							{agentLabel}
						</div>

						{/* Local video preview (small, bottom-right style) */}
						<div className="mx-auto mb-5 max-w-xs">
							<div className="relative aspect-video overflow-hidden rounded-xl border border-[#e4e6eb] bg-[#111]">
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="h-full w-full object-cover"
								/>
								{!cameraEnabled && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[12px] font-medium text-white">
										Camera off
									</div>
								)}
								<div className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white drop-shadow">
									You
								</div>
							</div>
						</div>

						{/* Elapsed timer */}
						<div className="mx-auto mb-6 max-w-xs rounded-xl border border-[#e4e6eb] bg-[#f7f8fa] px-5 py-3">
							<div className="text-[10.5px] font-bold tracking-wider text-[#65676b]">
								{strings.mockActive.elapsedLabel}
							</div>
							<div className="font-mono text-[22px] font-semibold text-[#080809]">
								{fmtElapsed(elapsedSec)}
							</div>
						</div>

						{roomError && (
							<div className="mx-auto mb-4 max-w-md rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-left text-[12px] text-[#991b1b]">
								{roomError.message}
							</div>
						)}

						<div className="flex flex-wrap justify-center gap-3">
							<PillButton
								variant="secondary"
								onClick={() => {
									void setMicEnabled(!micEnabled);
								}}
							>
								{micEnabled ? "🎙️ Mute mic" : "🔇 Unmute"}
							</PillButton>
							<PillButton
								variant="secondary"
								onClick={() => {
									void setCameraEnabled(!cameraEnabled);
								}}
							>
								{cameraEnabled ? "📷 Camera off" : "📷 Camera on"}
							</PillButton>
							<PillButton
								variant="primary"
								onClick={() => {
									void endMock();
								}}
							>
								{strings.mockActive.endMock}
							</PillButton>
						</div>
					</div>
				)}

				{phase === "processing" && (
					<div className="text-center py-10">
						<div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e7f3ff] border-t-[#1877f2]" />
						<h1 className="text-[20px] font-semibold text-[#080809]">
							{strings.mockActive.processingTitle}
						</h1>
						<p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.55] text-[#65676b]">
							{strings.mockActive.processingBody}
						</p>
						{statusQuery.data?.rawStatus && (
							<div className="mt-3 text-[10.5px] font-mono uppercase tracking-wider text-[#9ca3af]">
								Pipeline: {statusQuery.data.rawStatus}
							</div>
						)}
					</div>
				)}

				{phase === "dropped" && (
					<div className="mx-auto max-w-2xl">
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

				{phase === "no-creds" && (
					<div className="mx-auto max-w-md text-center py-10">
						<h1 className="text-[18px] font-semibold text-[#080809]">
							This mock session isn't active in your browser
						</h1>
						<p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.55] text-[#65676b]">
							Mock interview rooms only live in the tab you started them in.
							Head back to the hub and start a new mock.
						</p>
						<div className="mt-5">
							<PillButton variant="primary" onClick={backToHub}>
								Back to hub
							</PillButton>
						</div>
					</div>
				)}

				{phase === "ended" && (
					<div className="mx-auto max-w-md text-center py-10">
						<h1 className="text-[18px] font-semibold text-[#080809]">
							Mock ended
						</h1>
						<div className="mt-4">
							<PillButton variant="primary" onClick={backToHub}>
								Back to hub
							</PillButton>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
