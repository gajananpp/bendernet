import { Query } from "./store";

// Generic table row type - can be extended for specific data structures
export type TableRow = Record<
	string,
	string | number | boolean | null | undefined
>;

// Result type for filtered table operations
export type FilteredTableResult<T extends TableRow = TableRow> = {
	data: T[];
	totalRows: number;
	filteredRows: number;
};

/**
 * Filters a table based on a query object
 * @param table - Array of table rows to filter
 * @param query - Query object containing select and where clauses
 * @returns Filtered table result with selected columns and filtered rows
 */
export function filterTable<T extends TableRow>(
	table: T[],
	query: Query | null,
): FilteredTableResult<Partial<T>> {
	if (!query) {
		return {
			data: table,
			totalRows: table.length,
			filteredRows: table.length,
		};
	}

	const totalRows = table.length;

	// Step 1: Apply where clause filtering
	let filteredData = table;

	if (query.where) {
		const { column, operator, value } = query.where;

		filteredData = table.filter((row) => {
			const rowValue = row[column];

			// Handle null/undefined values
			if (rowValue === null || rowValue === undefined) {
				return operator === "!=" && value !== null && value !== undefined;
			}

			// Apply comparison based on operator
			switch (operator) {
				case "=":
					// Case-insensitive comparison for strings
					if (typeof rowValue === "string" && typeof value === "string") {
						return rowValue.toLowerCase() === value.toLowerCase();
					}
					return rowValue === value;
				case "!=":
					// Case-insensitive comparison for strings
					if (typeof rowValue === "string" && typeof value === "string") {
						return rowValue.toLowerCase() !== value.toLowerCase();
					}
					return rowValue !== value;
				case ">":
					return Number(rowValue) > Number(value);
				case "<":
					return Number(rowValue) < Number(value);
				case ">=":
					return Number(rowValue) >= Number(value);
				case "<=":
					return Number(rowValue) <= Number(value);
				default:
					return true;
			}
		});
	}

	// Step 2: Apply column selection
	let selectedData: Partial<T>[];

	if (query.select.includes("*")) {
		// Select all columns
		selectedData = filteredData;
	} else {
		// Select only specified columns
		selectedData = filteredData.map((row) => {
			const selectedRow: Record<string, unknown> = {};
			query.select.forEach((column) => {
				if (column in row) {
					selectedRow[column] = row[column];
				}
			});
			return selectedRow as Partial<T>;
		});
	}

	return {
		data: selectedData,
		totalRows,
		filteredRows: selectedData.length,
	};
}

/**
 * Helper function to get all unique column names from a table
 * @param table - Array of table rows
 * @returns Array of column names
 */
export function getTableColumns<T extends TableRow>(table: T[]): string[] {
	if (table.length === 0) return [];

	const columnSet = new Set<string>();
	table.forEach((row) => {
		Object.keys(row).forEach((key) => columnSet.add(key));
	});

	return Array.from(columnSet).sort();
}

/**
 * Helper function to validate if a query is valid for a given table
 * @param table - Array of table rows
 * @param query - Query object to validate
 * @returns Validation result with success flag and error message
 */
export function validateQuery<T extends TableRow>(
	table: T[],
	query: Query | null,
): { isValid: boolean; error?: string } {
	if (!query) {
		return { isValid: true };
	}

	const availableColumns = getTableColumns(table);

	// Validate where clause column
	if (query.where && !availableColumns.includes(query.where.column)) {
		return {
			isValid: false,
			error: `Column '${query.where.column}' does not exist in the table. Available columns: ${availableColumns.join(", ")}`,
		};
	}

	// Validate select columns (except for *)
	const invalidSelectColumns = query.select
		.filter((col) => col !== "*")
		.filter((col) => !availableColumns.includes(col));

	if (invalidSelectColumns.length > 0) {
		return {
			isValid: false,
			error: `Invalid select columns: ${invalidSelectColumns.join(", ")}. Available columns: ${availableColumns.join(", ")}`,
		};
	}

	return { isValid: true };
}
