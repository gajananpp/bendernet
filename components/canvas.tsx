"use client";

import * as React from "react";
import { DummyDatatable } from "./dummy-datatable";
import { BenderAvatar } from "./bender-avatar";
import { useEffect, useMemo } from "react";
import { BenderAvatarController } from "@/lib/bender-avatar";
import { useAppStore } from "@/lib/store";

// Define avatar state type for better type safety
type AvatarState =
	| "idle"
	| "typing"
	| "thinking"
	| "running-query"
	| "responding";

// Define avatar controller action types
type AvatarAction = keyof Pick<
	BenderAvatarController,
	| "startEyePupilTracking"
	| "startBlinking"
	| "startWobbling"
	| "stopSignalReceiving"
	| "hideThinkingCloud"
	| "stopTalking"
	| "startSignalReceiving"
	| "stopEyePupilTracking"
	| "startTalking"
>;

// Define behavior configuration interface
interface AvatarBehavior {
	eyeExpression: "idle" | "angry" | "thinking" | "mischief" | "boring";
	actions?: readonly AvatarAction[];
	thinkingCloud?: {
		icon: string;
		rotate: boolean;
		fontSize: number;
	};
}

// Avatar behavior configuration for each state
const AVATAR_BEHAVIORS: Record<AvatarState, AvatarBehavior> = {
	idle: {
		eyeExpression: "idle",
		actions: [
			"startEyePupilTracking",
			"startBlinking",
			"startWobbling",
			"stopSignalReceiving",
			"hideThinkingCloud",
			"stopTalking",
		],
	},
	typing: {
		eyeExpression: "boring",
		actions: ["startSignalReceiving", "stopEyePupilTracking"],
	},
	thinking: {
		eyeExpression: "thinking",
		actions: ["stopEyePupilTracking", "stopSignalReceiving"],
		thinkingCloud: { icon: "💡", rotate: false, fontSize: 32 },
	},
	"running-query": {
		eyeExpression: "mischief",
		actions: ["stopEyePupilTracking", "stopSignalReceiving"],
		thinkingCloud: { icon: "⚙️", rotate: true, fontSize: 32 },
	},
	responding: {
		eyeExpression: "angry",
		actions: ["startTalking", "stopEyePupilTracking", "hideThinkingCloud"],
	},
};

export function Canvas() {
	const benderAvatarSVGRef = React.useRef<SVGSVGElement>(null);
	const [benderAvatarController, setBenderAvatarController] =
		React.useState<BenderAvatarController | null>(null);

	// Use individual selectors to avoid object recreation on every render
	const isTyping = useAppStore((state) => state.isTyping);
	const isThinking = useAppStore((state) => state.isThinking);
	const isRunningQuery = useAppStore((state) => state.isRunningQuery);
	const isResponding = useAppStore((state) => state.isResponding);

	// Determine current avatar state using priority order
	const currentState: AvatarState = useMemo(() => {
		if (isResponding) return "responding";
		if (isRunningQuery) return "running-query";
		if (isThinking) return "thinking";
		if (isTyping) return "typing";
		return "idle";
	}, [isResponding, isRunningQuery, isThinking, isTyping]);

	// Initialize avatar controller
	useEffect(() => {
		if (!benderAvatarSVGRef.current) return;

		const controller = new BenderAvatarController(benderAvatarSVGRef.current);
		setBenderAvatarController(controller);

		// Cleanup on unmount
		return () => {
			controller.cleanup();
		};
	}, []);

	// Handle state transitions with a single effect
	useEffect(() => {
		if (!benderAvatarController) return;

		const behavior = AVATAR_BEHAVIORS[currentState];

		// Set eye expression
		benderAvatarController.setEyesExpression(behavior.eyeExpression);

		// Execute actions with proper typing
		behavior.actions?.forEach((action: AvatarAction) => {
			const method = benderAvatarController[action] as () => void;
			method.call(benderAvatarController);
		});

		// Handle thinking cloud
		if (behavior.thinkingCloud) {
			const { icon, rotate, fontSize } = behavior.thinkingCloud;
			benderAvatarController.showThinkingCloud(icon, rotate, fontSize);
		}
	}, [benderAvatarController, currentState]);

	return (
		<div className="flex flex-col h-full">
			<div
				className="h-1/2 border-b overflow-hidden relative flex items-end px-8"
				style={{
					backgroundImage:
						"radial-gradient( circle 331px at 1.4% 52.9%,  rgba(255,236,2,1) 0%, rgba(255,223,2,1) 33.6%, rgba(255,187,29,1) 61%, rgba(255,175,7,1) 100.7% )",
				}}
			>
				<div className="absolute inset-0"></div>
				<div className="relative z-10 ml-auto">
					{/* <img
            src="/bender.svg"
            alt="Bender"
            className="h-84 w-auto drop-shadow-2xl"
          /> */}
					<BenderAvatar
						className="h-96 w-auto drop-shadow-2xl -mb-1"
						ref={benderAvatarSVGRef}
					/>
				</div>
			</div>
			<div className="h-1/2 p-4 pt-0">
				<DummyDatatable />
			</div>
		</div>
	);
}
