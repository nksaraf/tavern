import { createContext } from "create-hook-context";
import { Text } from "ink";
import React from "react";

export function IndentedText({ children, ...props }) {
  const indent = useIndent();

  return (
    <Text {...props}>
      {Array.from(Array(indent).keys())
        .map((a) => " ")
        .join("")}
      {children}
    </Text>
  );
}

export const IndentContext = createContext(
  ({ indented = true }: { indented?: boolean }) => {
    const indent: number = useIndent() ?? 0;
    return indented ? indent + 1 : indent;
  },
  0
);

export const IndentProvider = IndentContext[0];
export const useIndent = IndentContext[1];
