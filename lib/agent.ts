// import { ChatOpenAI } from "@langchain/openai";
import {
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph/web";
import { tableOperationsGrammar } from "@/assets/table-operations.lark";
import { larkParse } from "./lark-parser-api";
import { filterTable } from "./table-ops";
import { sampleTableData, useAppStore } from "./store";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatWebLLM } from "./ChatWebLLM";
import { MODEL_NAME } from "./constants";

const GraphAnnotation = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		default: () => [],
		reducer: (x, y) => [...x, ...y],
	}),
	isQuery: Annotation<boolean>({
		default: () => false,
		reducer: (_x, y) => y,
	}),
});

function getModel() {
	const engine = useAppStore.getState().mlcEngine;
	if (!engine) {
		throw new Error("Engine not found");
	}
	return new ChatWebLLM(engine, {
		model: MODEL_NAME,
		temperature: 0.1,
		chatOptions: {
			context_window_size: 16384,
		},
	});
}

// const model = new ChatOpenAI({
// 	model: "gpt-4o-mini",
// 	temperature: 0.1,
// 	apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
// });

async function callClassifier(
	state: typeof GraphAnnotation.State,
	config: RunnableConfig,
) {
	console.log("state", state);
	const systemPrompt = `
**Objective:** You are a query classification bot. Your sole function is to determine if a user's query relates to a specific product database.

**Output Format:** You MUST respond with only the literal string "true" or "false", with no additional text or punctuation.

**Database Context:**
A query is considered relevant ("true") if it can be answered using a table with the following columns:
- id
- name
- category
- price
- stock
- status
- lastUpdated

**Rules:**
1.  Return "true" if the user is asking to find, filter, sort, or view products based on their attributes (e.g., category, price, stock level).
2.  Return "false" if the query is a greeting, a general question, or any form of chit-chat not related to the product data.
3.  Focus more on last message from user.

**Examples:**
**User:** Show me all electronics products/no_think
**You:** true

**User:** products with price > 100/no_think
**You:** true

**User:** products below 20$/no_think
**You:** true

**User:** stocks above 50/no_think
**You:** true

**User:** products below 20$/no_think
**You:** true

**User:** products that costs above 25/no_think
**You:** true

**User:** show me active products/no_think
**You:** true

**User:** find items in clothing category/no_think
**You:** true

**User:** list products updated last week/no_think
**You:** true

**User:** which items are pending status/no_think
**You:** true

**User:** expensive products over $50/no_think
**You:** true

**User:** What's the weather today?/no_think
**You:** false

**User:** hi/no_think
**You:** false

**User:** how are you?/no_think
**You:** false

**User:** tell me a joke/no_think
**You:** false
`;
	const lastMessage = state.messages[state.messages.length - 1];
	const response = await getModel().invoke(
		[
			new SystemMessage(systemPrompt),
			...state.messages.slice(0, -1),
			new HumanMessage(`${lastMessage.content}/no_think`),
		],
		{
			tags: ["classifier"],
			...config,
		},
	);
	const isQuery = response.content.toString().includes("true");
	return { isQuery: isQuery ?? false };
}

async function callQueryExecutor(
	state: typeof GraphAnnotation.State,
	config: RunnableConfig,
) {
	useAppStore.setState({ isRunningQuery: true });
	const systemPrompt = `
**Objective:** Your sole purpose is to translate a user's natural language request into a structured query string. You must adhere strictly to the defined syntax and schema.

**Output Requirements:** Your response must be **ONLY** the generated query string. Do not add explanations, markdown, or any other text.

---

## Query Syntax

Your output must follow one of these three formats:
1.  show [columns]
2.  show [columns] where [condition]
The output query string must strictly follow the given Lark grammar:
${tableOperationsGrammar}

**Component Definitions:**
-   **[columns]**: Either the * character or a comma-separated list of valid column names (e.g., name, price, stock).
-   **[condition]**: A single comparison in the format column_name operator value (e.g., price > 100 or status = 'available').
-   **operator**: One of =, !=, >, <, >=, <=.
-   **value**: A NUMBER or a STRING. Strings must always be enclosed in single quotes (e.g., 'electronics').

---

**Rules:**
- When you are unsure which columns to show/pick, use *.

---

## Database Schema

You are querying a products table. The only valid column names you can use are:
- id [string]
- name [string]
- category [string]
- price [number]
- stock [number]
- status [active, inactive, pending]
- lastUpdated [string]

---

## Examples

**User:** Show me the names and stock levels for all electronics products
**You:** show name, stock where category = 'electronics'

**User:** List all products that cost more than 50 dollars
**You:** show * where price > 50

**User:** I just need the product names and their prices.
**You:** show name, price

**User:** What's the status of the product with id 123?
**You:** show status where id = 123

When unsure which columns to show, use *.
**User:** What products are out of stock?
**You:** show * where stock = 0

**User:** products below 20$
**You:** show * where price < 20

**User:** stocks above 50
**You:** show * where stock > 50

**User:** products that costs above 25
**You:** show * where price > 25

**User:** show me active products
**You:** show * where status = 'active'

**User:** find items in clothing category
**You:** show * where category = 'clothing'

**User:** which items are pending status
**You:** show * where status = 'pending'

**User:** expensive products over $50
**You:** show * where price > 50

**User:** show product names and prices for electronics
**You:** show name, price where category = 'electronics'

**User:** inactive items with their stock levels
**You:** show name, stock where status = 'inactive'
  `;
	const response = await getModel().invoke(
		[new SystemMessage(systemPrompt), ...state.messages],
		{
			...config,
			tags: ["queryGenerator"],
		},
	);
	const query = response.content.toString().split("</think>")[1].trim();
	const parsedQuery = await larkParse(query);
	useAppStore.setState({ query: parsedQuery });
	const filteredTable = filterTable(sampleTableData, parsedQuery);
	useAppStore.setState({ filteredTableData: filteredTable.data });
	useAppStore.setState({ isRunningQuery: false });
	// return {
	//   messages: [new AIMessage(query), new HumanMessage(`Treat this as a internal system message, invisible to user. Reformat this query result in your style and respond to user. Query result:\n${JSON.stringify(filteredTable.data)}`)],
	// };
	return {};
}

async function callFinalAnswerGenerator(
	state: typeof GraphAnnotation.State,
	config: RunnableConfig,
) {
	const filteredTable = useAppStore.getState().filteredTableData;
	const systemPrompt = `
**Persona Mandate: Bender from Futurama**

**Core Personality:**
-   **Tone:** Sarcastic, brash, self-centered, and hilariously rude.
-   **Language:** Use slang, witty insults, and Bender's catchphrases (e.g., "meatbag," "bite my shiny metal ass").
-   **Attitude:** Supreme confidence. Everything is about you.

**Strict Output Rules:**
-   **Dialogue Only:** Your entire response must be in-character dialogue.
-   **No Narration:** Do not use stage directions or describe actions (e.g., *walks away*, *he says*).
-   **Stay in Character:** Never deviate from the Bender persona. Do not provide explanations as an AI.

${
	state.isQuery
		? `
**Displaying Query Results**
-   **Trigger:** When the user asks, "What is the query result?/no_think".
-   **Action:** First give a response on the given query result followed by displaying the given query result in a markdown table.
-   **Response Format:**
\`\`\`
**Summary:**
<Summary of the query result in Bender's style/tone>

**Query Result:**
<Query result markdown table>
\`\`\`
Dont reply with just the markdown table, reply with a response first.
-   **Query Result Data:**\n${JSON.stringify(filteredTable)}`
		: ""
}
`;

	const lastMessage = state.messages[state.messages.length - 1];
	const response = await getModel().invoke(
		state.isQuery
			? [
					new SystemMessage(systemPrompt),
					new HumanMessage("What is the query result?/no_think"),
				]
			: [
					new SystemMessage(systemPrompt),
					...state.messages.slice(0, -1),
					new HumanMessage(`${lastMessage.content}/no_think`),
				],
		{
			...config,
			tags: ["finalAnswerGenerator"],
		},
	);
	return { messages: [response] };
}

async function conditionallyExecute(state: typeof GraphAnnotation.State) {
	return state.isQuery ? "queryExecutor" : "finalAnswerGenerator";
}

const graph = new StateGraph(GraphAnnotation)
	.addNode("classifier", callClassifier)
	.addNode("queryExecutor", callQueryExecutor)
	.addNode("finalAnswerGenerator", callFinalAnswerGenerator)

	.addEdge(START, "classifier")
	.addConditionalEdges("classifier", conditionallyExecute)
	.addEdge("queryExecutor", "finalAnswerGenerator")
	.addEdge("finalAnswerGenerator", END);

export const agent = graph.compile();
