/**
 * Visually-hidden data table for screen-reader access to chart data.
 *
 * Charts rendered via ECharts (canvas) are invisible to assistive technology.
 * This component provides an equivalent HTML `<table>` that screen readers
 * can navigate while remaining visually hidden from sighted users.
 *
 * Usage:
 *   1. Wrap the ECharts container in `<div aria-hidden="true">`.
 *   2. Render `<ChartDataTable>` as a sibling with a matching `id`.
 *   3. Link them via `aria-describedby` on the outer wrapper.
 */

type ChartDataTableProps = {
  /** Visible to screen readers — describes what the table shows. */
  caption: string;
  /** Column headers, e.g. ["Day", "Hours"]. */
  headers: string[];
  /** Data rows, e.g. [["Mon", 2.5], ["Tue", 3.1]]. */
  rows: (string | number)[][];
  /** HTML `id` so the chart wrapper can reference this table via `aria-describedby`. */
  id?: string;
  className?: string;
};

export function ChartDataTable({
  caption,
  headers,
  rows,
  id,
  className,
}: ChartDataTableProps) {
  return (
    <table
      id={id}
      className={`sr-only ${className ?? ""}`}
      role="table"
    >
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => {
              // First column acts as a row header for better navigation
              if (cellIndex === 0) {
                return (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                );
              }
              return <td key={cellIndex}>{cell}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
