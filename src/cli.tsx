#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import { FileSystemProvider } from "./file";
import { PersistentStorageProvider } from "./persistence";

require("dotenv").config();
require("sucrase/register");
import { requireWithSucrase } from "./utils";

try {
  const Component = requireWithSucrase("tavern.config.tsx").default
    ? requireWithSucrase("tavern.config.tsx").default
    : requireWithSucrase("tavern.config.tsx");

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
  console.error(e);
  console.log("No tavern.config.tsx file found");
}
