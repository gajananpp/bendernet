import {
	ChatModelAdapter,
	TextMessagePart,
	ThreadMessage,
} from "@assistant-ui/react";
import { agent } from "./agent";
import {
	AIMessage,
	AIMessageChunk,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { useAppStore } from "./store";

function mapOpenAIToLangChain(
	messages: readonly ThreadMessage[],
): BaseMessage[] {
	return messages.map((msg) => {
		const content = msg.content
			.map((c) => (c as TextMessagePart).text)
			.join("");
		switch (msg.role) {
			case "system":
				return new SystemMessage({ content });
			case "user":
				return new HumanMessage({ content });
			case "assistant":
				return new AIMessage({ content });
			default:
				throw new Error(`Unknown role}`);
		}
	});
}

export const RuntimeAdapter: ChatModelAdapter = {
	async *run({ messages }) {
		const resetState = () => {
			useAppStore.setState({ isThinking: false });
			useAppStore.setState({ isResponding: false });
		};
		try {
			useAppStore.setState({ isThinking: true });
			const stream = await agent.stream(
				{ messages: mapOpenAIToLangChain(messages) },
				{
					streamMode: "messages",
				},
			);

			let text = "";
			let agentThoughts = "";
			let isThinkingToken = false;
			for await (const [message, metadata] of stream) {
				if (message instanceof AIMessageChunk) {
					const content = message.content.toString();
					const isThinkTag = ["<think>", "</think>"].includes(content);
					if (content.includes("<think>")) {
						isThinkingToken = true;
					} else if (content.includes("</think>")) {
						isThinkingToken = false;
						useAppStore.setState({ agentThoughts: "" });
					}
					if (
						metadata.tags?.includes("finalAnswerGenerator") &&
						!isThinkTag &&
						!isThinkingToken
					) {
						useAppStore.setState({ isResponding: true });
						text += message.content.toString() || "";
						yield {
							content: [{ type: "text", text }],
						};
					} else if (
						metadata.tags.includes("queryGenerator") &&
						!isThinkTag &&
						isThinkingToken
					) {
						agentThoughts += message.content.toString() || "";
						useAppStore.setState({ agentThoughts });
					}
				}
			}
			setTimeout(() => {
				resetState();
			}, 1000);
		} catch (error) {
			resetState();
			throw error;
		}
	},
};
