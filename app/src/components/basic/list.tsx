"use client";

import { ReactNode } from "react";

type ListProps<T> = {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
};

export default function List<T>({
  data,
  renderItem,
  emptyState = <div className="text-center text-muted-foreground">No data</div>,
}: ListProps<T>) {
  if (!data || data.length === 0) {
    return <div className="p-6">{emptyState}</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}