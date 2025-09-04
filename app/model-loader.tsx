"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { Assistant } from "./assistant";
import { useAppStore } from "@/lib/store";
import { MODEL_NAME, MODEL_SIZE } from "@/lib/constants";

export function ModelLoader() {
	const [progress, setProgress] = React.useState(0);
	const engine = useAppStore((state) => state.mlcEngine);
	const [loading, setLoading] = React.useState(engine === null);
	const total = 100;

	React.useEffect(() => {
		async function loadModel() {
			const engine = await CreateWebWorkerMLCEngine(
				new Worker(new URL("./web-llm-worker.ts", import.meta.url), {
					type: "module",
				}),
				MODEL_NAME,
				{
					initProgressCallback: (p) => {
						setProgress(Math.round(p.progress * 100));
						if (p.progress >= 0.999) setLoading(false);
					},
				}, // engineConfig
			);
			useAppStore.setState({ mlcEngine: engine });
		}
		loadModel();
	}, []);

	if (!loading) return <Assistant />;

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="max-w-md w-full space-y-6 text-center px-4">
				<div className="space-y-2">
					<div className="flex justify-center mb-4">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src="/bender-stamp.png"
							alt="Bender Stamp"
							className="w-30 rounded-lg"
						/>
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						BenderNet
					</h1>
					<p className="text-muted-foreground">
						This standalone app uses web-llm. Downloading model{" "}
						{`'${MODEL_NAME}'`} approximately {MODEL_SIZE} in browser for inference....
					</p>
				</div>

				<div className="space-y-3">
					<Progress value={progress} className="w-full h-2" />
					<div className="text-sm text-muted-foreground">
						{progress}/{total} completed
					</div>
				</div>
			</div>
		</div>
	);
}
