"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface ThoughtCardProps {
	className?: string;
	title?: string;
}

export function ThoughtCard({
	className,
	title = "Bender's Thoughts",
}: ThoughtCardProps) {
	const scrollAreaRef = React.useRef<HTMLDivElement>(null);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const agentThoughts = useAppStore((state) => state.agentThoughts);

	// Auto-scroll to bottom when text changes
	React.useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, [agentThoughts]);

	if (!agentThoughts) return null;

	return (
		<Card className={cn("w-full gap-0", className)}>
			<CardHeader className="pb-2 px-4">
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea
					ref={scrollAreaRef}
					className="h-[7.5rem] p-0" // Approximately 5 lines at standard line-height
				>
					<div
						ref={contentRef}
						className="p-4 text-sm leading-6 whitespace-pre-wrap"
					>
						{agentThoughts}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
