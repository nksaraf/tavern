import React from "react";
import { render } from "ink";
import { Executor, Task } from "./src/executor";
import { waitRandomly } from "./src/utils";
import { PersistentStorageProvider } from "./src/persistence";
import { FileSystemProvider, WriteFile } from "./src/file";

const App = () => {
  return (
    <PersistentStorageProvider>
      <FileSystemProvider>
        <Executor parallel>
          <WriteFile path="rough/index.txt" contents="hello world" />
          <Executor>
            <Task name="some task 1" onRun={waitRandomly} />
            <Task name="some task 2" onRun={waitRandomly} />
            <Task name="some task 3" onRun={waitRandomly} />
            <Executor parallel>
              <Task name="some task 4" onRun={waitRandomly} />
              <Task name="some task 5" onRun={waitRandomly} />
            </Executor>
            <Task name="cleanup" onRun={waitRandomly} />
          </Executor>
        </Executor>
      </FileSystemProvider>
    </PersistentStorageProvider>
  );
};

//     <Package name="tavern" version="0.3.6">
//       <TSUPProvider>
//         <EntryPoint name="cli" />
//         <MainEntryPoint />
//       </TSUPProvider>
//     </Package>
render(<App />);
