import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.mjs";

const pyodide = await loadPyodide();
await pyodide.loadPackage("micropip");
const micropip = await pyodide.pyimport("micropip");
await micropip.install("lark");

self.onmessage = async (event) => {
	const { python } = event.data;
	await pyodide.loadPackagesFromImports(python);
	try {
		const result = await pyodide.runPythonAsync(python, {});
		self.postMessage({ result });
	} catch (error) {
		console.error(error);
		self.postMessage({ error: "failed to parse" });
	}
};
