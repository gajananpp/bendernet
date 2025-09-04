import { tableOperationsGrammar } from "@/assets/table-operations.lark";
import { Query } from "./store";

let worker: Worker | null = null;

// Only create worker on client side
if (typeof window !== "undefined") {
	worker = new Worker("/lark-parser-worker.mjs", { type: "module" });
}

function requestResponse(msg: { python: string }) {
	if (!worker) {
		throw new Error(
			"Worker not available - this function can only run on the client side",
		);
	}

	const { promise, resolve } = Promise.withResolvers();
	worker.addEventListener("message", function listener(event) {
		worker!.removeEventListener("message", listener);
		resolve(event.data);
	});
	worker.postMessage(msg);
	return promise as Promise<{ result: unknown } | { error: string }>;
}

export async function larkParse(text: string) {
	// Check if we're on client side before proceeding
	if (typeof window === "undefined") {
		throw new Error("larkParse can only be called on the client side");
	}

	const code = `
import json
from lark import Lark, Transformer, v_args

@v_args(inline=True)
class QueryTransformer(Transformer):
    """
    This class transforms the parsed tree from Lark into a structured JSON object.
    Each method corresponds to a rule in the grammar.
    """
    # --- Transform basic value types ---
    def STRING(self, s):
        # Remove the quotes from the string
        return s[1:-1]

    def NUMBER(self, n):
        # Convert to float or int
        if '.' in n:
            return float(n)
        return int(n)

    def IDENTIFIER(self, i):
        return str(i)

    def OPERATOR(self, o):
        return str(o)

    # --- Transform rules ---
    def value(self, v):
        # The value is already processed by STRING or NUMBER, just pass it up
        return v

    def column_list(self, *items):
        # Receives multiple IDENTIFIER children, return them as a list of strings
        return list(items)

    def columns(self, cols=None):
        # If cols is None, it means the grammar matched "*"
        # which has no children to pass to the transformer.
        if cols is None:
            return ["*"]
        
        # Otherwise, 'cols' is the list from the column_list rule.
        return cols

    def condition(self, column, operator, value):
        # Assemble the condition into a dictionary
        return {
            "column": column,
            "operator": operator,
            "value": value
        }

    def query(self, cols, cond=None):
        # The main rule. It receives the processed columns and an optional condition.
        output = {
            "command": "query",
            "select": cols,
        }
        if cond:
            output["where"] = cond
        return output
        
    def start(self, query_obj):
        # The top-level rule, just return the final query object
        return query_obj


json_transformer = QueryTransformer()
query_parser = Lark(r"""${tableOperationsGrammar}""", start="start")
tree = query_parser.parse(${JSON.stringify(text)})
json_output = json_transformer.transform(tree)
json.dumps(json_output, indent=2)
`.trim();
	const result = await requestResponse({ python: code });
	if ("error" in result) {
		throw new Error(result.error);
	}
	return JSON.parse(result.result as string) as Query;
}
