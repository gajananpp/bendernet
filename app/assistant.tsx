"use client";

import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { BotMessageSquare } from "lucide-react";
import { Canvas } from "@/components/canvas";
import { RuntimeAdapter } from "@/lib/runtime-adapter";
import { GitHubStarButton } from "@/components/github-star-button";
import "@/lib/lark-parser-api";

export const Assistant = () => {
	const runtime = useLocalRuntime(RuntimeAdapter);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="flex h-dvh w-full flex-col">
				<div className="flex-1 overflow-hidden">
					<div className="flex h-full">
						<div className="w-1/2 border-r overflow-hidden">
							<header className="flex h-10 fixed top-0 left-0 right-0 shrink-0 items-center gap-1 border-b px-4 bg-background z-10 w-1/2">
								<div className="flex aspect-square size-8 items-center justify-center">
									<BotMessageSquare className="size-6" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-semibold">BenderNet</span>
								</div>
								<div className="ml-auto">
									<GitHubStarButton />
								</div>
							</header>
							<Thread />
						</div>
						<div className="w-1/2 overflow-hidden">
							<Canvas />
						</div>
					</div>
				</div>
			</div>
		</AssistantRuntimeProvider>
	);
};
