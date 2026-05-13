// LiveKit room connection hook for the candidate-prep voice mock.
// Mirrors the pattern in www/react/src/apps/agentConversationKit/hooks/useLivekitClient.ts
// from the main Eightfold repo, with one important change for dev ergonomics:
// the Room instance is created *inside* the effect, not via useRef. React 18's
// StrictMode runs effects twice in dev, and reusing a single Room across the
// mount → cleanup → mount cycle wedges the SDK ("PC manager is closed" errors
// once the first cleanup closes the RTCPeerConnection). Letting each mount
// instantiate its own Room sidesteps that entirely.
//
// Audio is required so the agent can hear the candidate; video is captured so
// the interview matches the recruiter-side experience (and feeds LiveKit
// recording). The AI agent itself has no video — it's an audio-only participant.

import { useEffect, useRef, useState } from "react";
import {
	createLocalTracks,
	LocalVideoTrack,
	Room,
	RoomEvent,
	Track,
	type LocalTrack,
	type RemoteParticipant,
	type RemoteTrack,
	type RemoteTrackPublication,
} from "livekit-client";

import type { MockLivekitStashed } from "../pages/MockLaunchPage";

export type RoomState =
	| "idle"
	| "connecting"
	| "connected"
	| "agent-joined"
	| "disconnected"
	| "error";

export interface UseLivekitMockRoomResult {
	state: RoomState;
	error: Error | null;
	/** Number of remote (non-self) participants. > 0 means the agent has joined. */
	remoteParticipantCount: number;
	/** Toggle mic publish on/off. */
	setMicEnabled: (on: boolean) => Promise<void>;
	micEnabled: boolean;
	/** Toggle camera publish on/off. */
	setCameraEnabled: (on: boolean) => Promise<void>;
	cameraEnabled: boolean;
	/** Local camera track — attach to a <video> element via track.attach(). */
	localVideoTrack: LocalVideoTrack | null;
	/** Disconnect (caller is responsible for navigation). */
	disconnect: () => Promise<void>;
}

export function useLivekitMockRoom(
	creds: MockLivekitStashed | null,
): UseLivekitMockRoomResult {
	const [state, setState] = useState<RoomState>("idle");
	const [error, setError] = useState<Error | null>(null);
	const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
	const [micEnabled, setMicEnabledState] = useState(true);
	const [cameraEnabled, setCameraEnabledState] = useState(true);
	const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(
		null,
	);
	// The active Room — kept in a ref so imperative actions (mic toggle, end
	// call) reach the same instance the effect is managing.
	const roomRef = useRef<Room | null>(null);

	useEffect(() => {
		if (!creds) {
			return;
		}
		// Each mount gets its own Room. StrictMode's first cleanup closes this
		// instance entirely; the second mount creates a fresh one.
		const room = new Room({ adaptiveStream: true, dynacast: true });
		roomRef.current = room;
		let mounted = true;
		const localTracks: LocalTrack[] = [];
		const attachedAudioEls: HTMLAudioElement[] = [];

		const handleParticipantConnected = (_p: RemoteParticipant) => {
			if (!mounted) return;
			setRemoteParticipantCount(room.remoteParticipants.size);
			setState("agent-joined");
		};
		const handleParticipantDisconnected = (_p: RemoteParticipant) => {
			if (!mounted) return;
			setRemoteParticipantCount(room.remoteParticipants.size);
		};
		const handleDisconnected = () => {
			if (!mounted) return;
			setState("disconnected");
		};
		// LiveKit JS SDK doesn't auto-play remote audio — we have to attach it.
		// The browser allows the resulting <audio>.play() because the user
		// gestured (click "Join") on the previous page.
		const handleTrackSubscribed = (
			track: RemoteTrack,
			_pub: RemoteTrackPublication,
			_participant: RemoteParticipant,
		) => {
			if (track.kind === Track.Kind.Audio) {
				const el = track.attach() as HTMLAudioElement;
				el.style.display = "none";
				document.body.appendChild(el);
				attachedAudioEls.push(el);
			}
		};
		const handleTrackUnsubscribed = (track: RemoteTrack) => {
			if (track.kind === Track.Kind.Audio) {
				const els = track.detach();
				els.forEach((el) => {
					el.remove();
					const idx = attachedAudioEls.indexOf(el);
					if (idx >= 0) attachedAudioEls.splice(idx, 1);
				});
			}
		};

		room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
		room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
		room.on(RoomEvent.Disconnected, handleDisconnected);
		room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
		room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

		void (async () => {
			try {
				setState("connecting");
				await room.connect(creds.serverUrl, creds.token);
				if (!mounted) {
					await room.disconnect();
					return;
				}
				const tracks = await createLocalTracks({
					audio: true,
					video: { facingMode: "user" },
				});
				if (!mounted) {
					tracks.forEach((t) => t.stop());
					await room.disconnect();
					return;
				}
				for (const track of tracks) {
					localTracks.push(track);
					await room.localParticipant.publishTrack(track);
					if (track instanceof LocalVideoTrack) {
						setLocalVideoTrack(track);
					}
				}
				setState("connected");
				setRemoteParticipantCount(room.remoteParticipants.size);
				if (room.remoteParticipants.size > 0) {
					setState("agent-joined");
				}
			} catch (err) {
				if (!mounted) return;
				// eslint-disable-next-line no-console
				console.error("[candidate-prep] LiveKit connect failed", err);
				setError(err instanceof Error ? err : new Error(String(err)));
				setState("error");
			}
		})();

		return () => {
			mounted = false;
			room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
			room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
			room.off(RoomEvent.Disconnected, handleDisconnected);
			room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
			room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
			attachedAudioEls.forEach((el) => el.remove());
			localTracks.forEach((t) => t.stop());
			if (roomRef.current === room) {
				roomRef.current = null;
			}
			setLocalVideoTrack(null);
			void room.disconnect();
		};
		// Re-run only when the cred *values* change (new mock session). The
		// MockLivekitStashed object itself may be a new reference per render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [creds?.serverUrl, creds?.token]);

	const setMicEnabled = async (on: boolean) => {
		const room = roomRef.current;
		if (!room) return;
		await room.localParticipant.setMicrophoneEnabled(on);
		setMicEnabledState(on);
	};
	const setCameraEnabled = async (on: boolean) => {
		const room = roomRef.current;
		if (!room) return;
		await room.localParticipant.setCameraEnabled(on);
		setCameraEnabledState(on);
	};
	const disconnect = async () => {
		const room = roomRef.current;
		if (!room) return;
		await room.disconnect();
	};

	return {
		state,
		error,
		remoteParticipantCount,
		setMicEnabled,
		micEnabled,
		setCameraEnabled,
		cameraEnabled,
		localVideoTrack,
		disconnect,
	};
}
