#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import { FileSystemProvider } from "./File";
import { PersistentStorageProvider } from "./usePersistentState";

require("dotenv").config();
require("sucrase/register");
import { requireWithSucrase } from "./require";

try {
  const Component = requireWithSucrase("tavern.config.js").default
    ? requireWithSucrase("tavern.config.js").default
    : requireWithSucrase("tavern.config.js");

  try {
    render(
      <PersistentStorageProvider>
        <FileSystemProvider>
          <Component />
        </FileSystemProvider>
      </PersistentStorageProvider>
    );
  } catch (e) {
    console.error(e);
  }
} catch (e) {
  console.log("No tavern.config.tsx file found");
}
