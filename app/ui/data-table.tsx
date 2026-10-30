import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
};

export function DataTable<T>({ columns, rows, getRowKey }: DataTableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E9E9E7] bg-white">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-[#F7F7F5]">
            <tr className="border-b border-[#E9E9E7]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold text-[#787774] ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EEEEEC]">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="transition-colors hover:bg-[#FAFAF9]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 align-middle text-[#373737] ${column.className ?? ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
