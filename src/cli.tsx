#!/usr/bin/env node
import { render, Box, Text } from "ink";

import { IndentedText } from "./indent";
import React from "react";
import { FileSystemProvider, WriteFileTask, File } from "./file";
import { PersistentStorageProvider } from "./persistence";
import mdx from "@mdx-js/mdx";
import { MDXProvider } from "@mdx-js/react";

require("dotenv").config();

import { requireWithSucrase } from "./utils";
import * as pirates from "pirates";
import { Options, transform } from "sucrase";
import { Executor, Task } from "./executor";

export function addHook(
  extension: string,
  { mdx: isMdx, ...options }: Options & { mdx?: boolean }
): void {
  pirates.addHook(
    (code: string, filePath: string): string => {
      const { code: transformedCode, sourceMap } = transform(
        isMdx
          ? `const {mdx} = require("@mdx-js/react");
          const path = require('path');
          console.log('Loading Tavern config from', path.basename(__filename));
        ${mdx.sync(`${code}`)}`
          : code,
        {
          ...options,
          jsxPragma: isMdx ? "mdx" : "React.createElement",
          sourceMapOptions: { compiledFilename: filePath },
          filePath,
        }
      );

      const mapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString(
        "base64"
      );
      const suffix = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}`;
      return `${transformedCode}\n${suffix}`;
    },
    { exts: [extension] }
  );
}

export function registerExtensions(): void {
  addHook(".mdx", { transforms: ["imports", "typescript", "jsx"], mdx: true });
  addHook(".js", { transforms: ["imports", "flow", "jsx"] });
  addHook(".jsx", { transforms: ["imports", "flow", "jsx"] });
  addHook(".ts", { transforms: ["imports", "typescript"] });
  addHook(".tsx", { transforms: ["imports", "typescript", "jsx"] });
}

registerExtensions();

try {
  const Component = requireWithSucrase("tavern.config").default
    ? requireWithSucrase("tavern.config").default
    : requireWithSucrase("tavern.config");

  if (Component.isMDXComponent) {
  }

  const MDXTavern = ({ children }) => {
    return (
      <MDXProvider
        components={{
          Executor,
          h1: ({ children, ...props }) => (
            <IndentedText {...props}>{children}</IndentedText>
          ),
          h2: ({ children, ...props }) => (
            <IndentedText {...props}>{children}</IndentedText>
          ),
          p: ({ children, ...props }) => (
            <IndentedText {...props}>{children}</IndentedText>
          ),
          ul: ({ children, ...props }) => (
            <Executor>
              <Box flexDirection="column" {...props}>
                {children}
              </Box>
            </Executor>
          ),
          li: ({ children, ...props }) => <>{children}</>,
          Task,
          File,
        }}
      >
        <PersistentStorageProvider>
          <FileSystemProvider>
            <Executor indented={false}>{children}</Executor>
          </FileSystemProvider>
        </PersistentStorageProvider>
      </MDXProvider>
    );
  };
  const Tavern = ({ children }) => {
    return (
      <PersistentStorageProvider>
        <FileSystemProvider>
          <Executor indented={false}>{children}</Executor>
        </FileSystemProvider>
      </PersistentStorageProvider>
    );
  };

  try {
    render(
      Component.isMDXComponent ? (
        <MDXTavern>
          <Component />
        </MDXTavern>
      ) : (
        <Tavern>
          <Component />
        </Tavern>
      )
    );
  } catch (e) {
    console.error(e);
  }
} catch (e) {
  console.error(e);
  console.log("No tavern.config.{tsx/jsx/mdx} file found");
}
