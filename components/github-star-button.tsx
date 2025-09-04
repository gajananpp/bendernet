"use client";

import { Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GitHubStarButtonProps {
	repoUrl?: string;
	className?: string;
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "default" | "lg";
}

export function GitHubStarButton({ 
	repoUrl = "https://github.com/gajananpp/bendernet",
	className = "",
	variant = "outline",
	size = "sm"
}: GitHubStarButtonProps) {
	const handleClick = () => {
		window.open(repoUrl, "_blank", "noopener,noreferrer");
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={variant}
						size={size}
						onClick={handleClick}
						className={`gap-2 ${className}`}
					>
						<Star className="size-4" />
						<span className="hidden sm:inline">Star on GitHub</span>
						<ExternalLink className="size-3 opacity-70" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Star this project on GitHub</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
