import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type Node = {
	type: string;
	value?: string;
	children?: Node[];
};

export function findByType(node: Node, type: string): Node | null {
	if (node.type === type) {
		return node;
	}

	if (node.children) {
		for (const child of node.children) {
			const result = findByType(child, type);
			if (result) return result;
		}
	}

	return null;
}
