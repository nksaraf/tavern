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

export const IndentContext = createContext(({}: {}) => {
  const indent: number = useIndent() ?? 0;
  return indent + 1;
}, 0);

export const IndentProvider = IndentContext[0];
export const useIndent = IndentContext[1];
