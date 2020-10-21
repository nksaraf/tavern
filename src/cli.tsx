#!/usr/bin/env node

require("dotenv").config();
import "./register";

import { render, Box, Text, useInput } from "ink";
import { IndentedText } from "./indent";
import React from "react";
import { FileSystemProvider, WriteFileTask, File } from "./file";
import { PersistentStorageProvider } from "./persistence";
import { MDXProvider } from "@mdx-js/react";
import { requireWithSucrase } from "./utils";
import { Executor, Task } from "./executor";

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
        <Tavern>{children}</Tavern>
      </MDXProvider>
    );
  };

  const Tavern = ({ children }) => {
    const ref = React.useRef<Executor>();

    useInput((a, e) => {
      if (e.return) {
        ref.current?.execute();
      }
    });

    return (
      <>
        <PersistentStorageProvider>
          <FileSystemProvider>
            <Executor indented={false} executeOnRender={false} ref={ref}>
              {children}
            </Executor>
          </FileSystemProvider>
        </PersistentStorageProvider>
      </>
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
