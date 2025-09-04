import React from "react";
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { SampleData, sampleTableData, useAppStore } from "@/lib/store";

// Data Table Component
export function DummyDatatable() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const query = useAppStore((state) => state.query);
	const filteredTableData = useAppStore((state) => state.filteredTableData);

	// Base column definitions
	const baseColumns: ColumnDef<SampleData>[] = React.useMemo(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
							className="h-auto p-0 font-semibold"
						>
							Name
							<ArrowUpDown className="ml-2 h-4 w-4" />
						</Button>
					);
				},
				cell: ({ row }) => (
					<div className="font-medium">{row.getValue("name")}</div>
				),
				size: 250,
			},
			{
				accessorKey: "category",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
							className="h-auto p-0 font-semibold"
						>
							Category
							<ArrowUpDown className="ml-2 h-4 w-4" />
						</Button>
					);
				},
				cell: ({ row }) => (
					<div className="font-medium">{row.getValue("category")}</div>
				),
				size: 150,
			},
			{
				accessorKey: "price",
				header: ({ column }) => {
					return (
						<div className="text-right">
							<Button
								variant="ghost"
								onClick={() =>
									column.toggleSorting(column.getIsSorted() === "asc")
								}
								className="h-auto p-0 font-semibold"
							>
								Price
								<ArrowUpDown className="ml-2 h-4 w-4" />
							</Button>
						</div>
					);
				},
				cell: ({ row }) => {
					const price = parseFloat(row.getValue("price"));
					return (
						<div className="text-right font-medium">${price.toFixed(2)}</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "stock",
				header: ({ column }) => {
					return (
						<div className="text-center">
							<Button
								variant="ghost"
								onClick={() =>
									column.toggleSorting(column.getIsSorted() === "asc")
								}
								className="h-auto p-0 font-semibold"
							>
								Stock
								<ArrowUpDown className="ml-2 h-4 w-4" />
							</Button>
						</div>
					);
				},
				cell: ({ row }) => {
					const stock = row.getValue("stock") as number;
					return (
						<div className="text-center">
							<span
								className={`font-medium ${
									stock === 0
										? "text-red-600"
										: stock < 50
											? "text-yellow-600"
											: "text-green-600"
								}`}
							>
								{stock}
							</span>
						</div>
					);
				},
				size: 80,
			},
			{
				accessorKey: "status",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
							className="h-auto p-0 font-semibold"
						>
							Status
							<ArrowUpDown className="ml-2 h-4 w-4" />
						</Button>
					);
				},
				cell: ({ row }) => {
					const status = row.getValue("status") as string;
					const statusColors = {
						active: "bg-green-100 text-green-800",
						inactive: "bg-red-100 text-red-800",
						pending: "bg-yellow-100 text-yellow-800",
					};
					return (
						<div
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
								statusColors[status as keyof typeof statusColors]
							}`}
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "lastUpdated",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
							className="h-auto p-0 font-semibold"
						>
							Last Updated
							<ArrowUpDown className="ml-2 h-4 w-4" />
						</Button>
					);
				},
				cell: ({ row }) => {
					const date = new Date(row.getValue("lastUpdated"));
					// Use consistent date formatting to avoid hydration mismatch
					const formattedDate = `${date.getFullYear()}-${String(
						date.getMonth() + 1,
					).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
					return <div className="text-sm text-gray-600">{formattedDate}</div>;
				},
				size: 120,
			},
		],
		[],
	);

	// Filter columns based on query selection
	const columns: ColumnDef<SampleData>[] = React.useMemo(() => {
		if (query && query.select && !query.select.includes("*")) {
			// Filter columns to only include selected ones
			return baseColumns.filter((column) => {
				if ("accessorKey" in column && column.accessorKey) {
					return query.select.includes(column.accessorKey as string);
				}
				return false;
			});
		}
		// If no query or select all (*), return all columns
		return baseColumns;
	}, [baseColumns, query]);

	// Use filtered data if available, otherwise use full sample data
	const tableData =
		filteredTableData.length > 0
			? (filteredTableData as SampleData[])
			: sampleTableData;

	const table = useReactTable({
		data: tableData,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	});

	return (
		<div className="w-full mt-10">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											style={{ width: header.getSize() }}
											className="whitespace-nowrap"
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											style={{
												width: cell.column.getSize(),
											}}
											className="whitespace-nowrap"
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
