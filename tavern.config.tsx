import React from "react";

import {
  Package,
  MainEntryPoint,
  TSUPProvider,
  EntryPoint,
} from "./dist/index";

export default () => {
  console.log("here");
  return (
    <>
      <Package name="tavern" version="0.3.6">
        <TSUPProvider>
          <EntryPoint name="cli" />
          <MainEntryPoint />
        </TSUPProvider>
      </Package>
    </>
  );
};
