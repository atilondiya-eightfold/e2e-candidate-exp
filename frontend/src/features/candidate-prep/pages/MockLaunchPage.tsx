import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";

import { ErrorPanel } from "../components/ErrorPanel";
import { PillButton } from "../components/PillButton";
import { TopNav } from "../components/TopNav";
import { useApplication, useCreateMock } from "../hooks";
import { focusChipsByMock, meetingDetails } from "../mocks/data";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
}

export function MockLaunchPage({ applicationId }: Props): ReactElement {
	const navigate = useNavigate();
	const demoState = usePrepDemoStore((s) => s.state);
	const [showMicTest, setShowMicTest] = useState(false);
	const [connectError, setConnectError] = useState(false);
	const s = strings.mockLaunch;

	const appQ = useApplication(
		demoState === "populated" ? applicationId : undefined,
	);
	const createMock = useCreateMock();

	// Focus chips come from the gap-analysis pickdown when the API is live;
	// fall back to the fixture when offline.
	const focus = focusChipsByMock["mock_2"];

	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });
	const join = () => {
		if (demoState === "error") {
			setConnectError(true);
			return;
		}
		// If we have a real application id from the API, create the mock then
		// transition; otherwise fall back to the fixture mock id.
		if (appQ.data?.application_id) {
			createMock.mutate(
				{ applicationId: appQ.data.application_id },
				{
					onSuccess: (mock) => {
						if (mock.meeting?.url) {
							console.log("[candidate-prep] opening meeting", mock.meeting.url);
						}
						navigate({
							to: "/prep/$applicationId/mock/$mockId/active",
							params: { applicationId, mockId: mock.mock_id },
						});
					},
					onError: () => setConnectError(true),
				},
			);
			return;
		}
		console.log("[candidate-prep] opening meeting", meetingDetails.url);
		navigate({
			to: "/prep/$applicationId/mock/$mockId/active",
			params: { applicationId, mockId: "mock_2" },
		});
	};

	return (
		<div className="bg-[#f5f6f8] min-h-screen">
			<div className="bg-white">
				<TopNav applicationId={applicationId} />
			</div>
			<div className="mx-auto max-w-3xl px-4 py-8 sm:px-10 sm:py-10">
				<button
					type="button"
					onClick={backToHub}
					className="mb-2.5 text-[12px] text-[#1877f2] hover:underline"
				>
					{strings.common.backToHubLink}
				</button>
				<h1 className="text-[21px] font-bold text-[#111]">{s.title}</h1>
				<p className="mt-1 mb-4 text-[12.5px] text-[#65676b]">{s.subtitle}</p>

				{connectError && (
					<div className="mb-4">
						<ErrorPanel
							tone="red"
							icon="🎤"
							title={strings.errors.mockConnect.title}
							body={
								<>
									<p className="mb-2.5">{strings.errors.mockConnect.body}</p>
									<ul className="space-y-1">
										{strings.errors.mockConnect.bullets.map((b) => (
											<li key={b}>• {b}</li>
										))}
									</ul>
								</>
							}
							actions={[
								{
									label: strings.errors.mockConnect.retry,
									onClick: () => {
										usePrepDemoStore.getState().setState("populated");
										setConnectError(false);
									},
									variant: "primary",
								},
								{
									label: strings.errors.mockConnect.alt,
									onClick: backToHub,
									variant: "secondary",
								},
							]}
							footer={strings.errors.mockConnect.footer}
						/>
					</div>
				)}

				{/* Meeting card */}
				<section className="mb-3.5 rounded-xl border border-[#e5e7eb] bg-white p-5">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<div className="mb-1.5 text-[13px] font-bold text-[#111]">
								{s.meeting.heading}
							</div>
							<div className="text-[11.5px] leading-[1.6] text-[#65676b]">
								<div>
									{s.meeting.idLabel}{" "}
									<b className="text-[#111]">{meetingDetails.meetingId}</b>
								</div>
								<div>
									{s.meeting.passcodeLabel}{" "}
									<b className="text-[#111]">{meetingDetails.passcode}</b>
								</div>
								<div>
									{s.meeting.hostedLabel}{" "}
									<b className="text-[#111]">{s.meeting.hostNote}</b>
								</div>
							</div>
						</div>
						<div className="flex flex-col items-end gap-2">
							<PillButton size="lg" onClick={join}>
								{s.meeting.join}
							</PillButton>
							<PillButton
								size="sm"
								variant="secondary"
								onClick={() => setShowMicTest(true)}
							>
								{s.meeting.testMic}
							</PillButton>
						</div>
					</div>
				</section>

				{/* Tips */}
				<section className="mb-3.5 rounded-xl border border-[#e5e7eb] bg-white p-4">
					<div className="mb-2.5 text-[10.5px] font-bold tracking-wider text-[#1f3a68]">
						{s.tipsHeading}
					</div>
					<div className="grid gap-2.5 text-[12px] leading-[1.5] text-[#374151] sm:grid-cols-2">
						{s.tips.map((tip) => (
							<div key={tip}>{tip}</div>
						))}
					</div>
				</section>

				{/* What you'll be asked */}
				<section className="rounded-xl border border-[#e5e7eb] bg-white p-4">
					<div className="mb-2.5 text-[10.5px] font-bold tracking-wider text-[#1f3a68]">
						{s.askedHeading}
					</div>
					<p className="mb-3 text-[12px] leading-[1.55] text-[#374151]">
						{s.askedFraming}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{focus?.focus.map((c) => (
							<span
								key={c.id}
								className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#1f3a68]"
							>
								{c.label}
							</span>
						))}
						{focus?.review.map((c) => (
							<span
								key={c.id}
								className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] text-[#65676b]"
							>
								{c.label}
							</span>
						))}
					</div>
				</section>

				{showMicTest && (
					<MicTestModal
						onCancel={() => setShowMicTest(false)}
						onJoin={() => {
							setShowMicTest(false);
							join();
						}}
					/>
				)}
			</div>
		</div>
	);
}

function MicTestModal({
	onCancel,
	onJoin,
}: {
	onCancel: () => void;
	onJoin: () => void;
}): ReactElement {
	return (
		<div
			className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
				<h2 className="text-[16px] font-semibold text-[#080809]">
					Test your mic
				</h2>
				<p className="mt-2 text-[12.5px] leading-[1.5] text-[#65676b]">
					Speak a sentence. Watch the bars move. If they don't, your browser
					might be blocking mic access — check the browser settings and try
					again.
				</p>
				<div className="my-5 flex items-end justify-center gap-1.5">
					{[12, 24, 18, 30, 22, 16, 28].map((h, i) => (
						<span
							key={i}
							className="w-1.5 rounded-sm bg-[#1877f2]"
							style={{
								height: `${h}px`,
								opacity: 0.55 + (i % 3) * 0.15,
							}}
						/>
					))}
				</div>
				<div className="flex justify-end gap-2.5">
					<PillButton variant="secondary" onClick={onCancel}>
						Cancel
					</PillButton>
					<PillButton variant="primary" onClick={onJoin}>
						Looks good — join
					</PillButton>
				</div>
			</div>
		</div>
	);
}
