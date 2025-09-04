import { create } from "zustand";
import * as webllm from "@mlc-ai/web-llm";

export type Query = {
	command: "query";
	select: string[];
	where: {
		column: string;
		operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
		value: string | number | boolean;
	};
};

export type SampleData = {
	id: string;
	name: string;
	category: string;
	price: number;
	stock: number;
	status: "active" | "inactive" | "pending";
	lastUpdated: string;
};

// Sample data
export const sampleTableData: SampleData[] = [
	{
		id: "PRD-001",
		name: "Wireless Bluetooth Headphones",
		category: "Electronics",
		price: 89.99,
		stock: 45,
		status: "active",
		lastUpdated: "2024-01-15",
	},
	{
		id: "PRD-002",
		name: "Organic Cotton T-Shirt",
		category: "Clothing",
		price: 24.99,
		stock: 120,
		status: "active",
		lastUpdated: "2024-01-14",
	},
	{
		id: "PRD-003",
		name: "Stainless Steel Water Bottle",
		category: "Home & Garden",
		price: 19.99,
		stock: 0,
		status: "inactive",
		lastUpdated: "2024-01-13",
	},
	{
		id: "PRD-004",
		name: "Yoga Mat Premium",
		category: "Sports & Fitness",
		price: 34.99,
		stock: 67,
		status: "active",
		lastUpdated: "2024-01-16",
	},
	{
		id: "PRD-005",
		name: "Smartphone Case Leather",
		category: "Electronics",
		price: 15.99,
		stock: 89,
		status: "pending",
		lastUpdated: "2024-01-12",
	},
	{
		id: "PRD-006",
		name: "Coffee Maker Automatic",
		category: "Home & Garden",
		price: 129.99,
		stock: 23,
		status: "active",
		lastUpdated: "2024-01-15",
	},
];

interface AppState {
	query: Query | null;
	queryText: string;
	tableData: SampleData[];
	filteredTableData: Partial<SampleData>[];
	isTyping: boolean;
	isThinking: boolean;
	isRunningQuery: boolean;
	isResponding: boolean;
	mlcEngine: webllm.WebWorkerMLCEngine | null;
	agentThoughts: string;
}

// Function to convert Query object to natural language
function queryToNaturalLanguage(query: Query | null): string {
	if (!query) return "";

	let text = "Show ";

	// Handle select columns
	if (query.select.includes("*")) {
		text += "all columns";
	} else {
		text += query.select.join(", ");
	}

	// Handle where clause
	if (query.where) {
		const { column, operator, value } = query.where;
		text += ` where ${column} ${operator} ${value}`;
	}

	return text;
}

export const useAppStore = create<AppState>((set) => ({
	query: null,
	queryText: "",
	setQuery: (query: Query | null) =>
		set({
			query,
			queryText: queryToNaturalLanguage(query),
		}),

	tableData: sampleTableData,
	filteredTableData: [],
	setFilteredTableData: (filteredTableData: SampleData[]) =>
		set({ filteredTableData }),

	isTyping: false,
	isThinking: false,
	isRunningQuery: false,
	isResponding: false,

	mlcEngine: null,
	agentThoughts: "",
}));
