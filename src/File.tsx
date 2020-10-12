import { Text } from "ink";
import React from "react";
import * as fs from "fs";
const mkdirp = require("mkdirp");
import pathUtils from "path";
import { createContext } from "create-hook-context";
import { useReducerWithEffects } from "usables/useReducerWithEffects";
import { usePersistentStateWithCleanup } from "./persistence";
import { useCleanup } from "./utils";
import { createDesign, useStateDesigner } from "state-designer";
import { Task, useTask } from "./executor";

export const FileSystemContext = createContext(({}: {}) => {
  const { touch, cleanup } = usePersistentStateWithCleanup(
    "filesystem",
    (file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    },
    {}
  );

  useCleanup(cleanup);

  return {
    touchFile: touch,
  };
});

export const FileSystemProvider = FileSystemContext[0];
export const useFileSystem = FileSystemContext[1];

const resourceDesign = createDesign({
  initial: "idle",
  data: { path: "a", contents: null, error: null },
  states: {
    reading: {
      async: {
        await: "readFile",
        onResolve: [
          "loadContents",
          {
            if: "emptyContents",
            to: "empty",
          },
          {
            unless: "emptyContents",
            to: "filled",
          },
        ],
      },
    },
    empty: {
      on: {
        READ_FILE: {
          to: "reading",
        },
        SET_CONTENTS: [
          "setContents",
          { if: "noContents", to: "empty" },
          { unless: "noContents", to: "filled" },
        ],
      },
    },
    filled: {
      initial: "not_writing",
      on: {
        READ_FILE: {
          to: "reading",
        },
        WRITE_FILE: [
          { unless: "noContents", do: "setContents" },
          {
            to: "writing",
          },
        ],
        SET_CONTENTS: [
          "setContents",
          { if: "noContents", to: "empty" },
          { unless: "noContents", to: "filled" },
        ],
      },
      states: {
        written: {},
        error: {},
        not_writing: {},
        writing: {
          async: {
            await: "writeFile",
            onResolve: [{ to: "written" }],
            onReject: ["setError", { to: "error" }],
          },
        },
      },
    },
    idle: {
      on: {
        READ_FILE: {
          to: "reading",
        },
        SET_CONTENTS: [
          "setContents",
          { if: "noContents", to: "empty" },
          { unless: "noContents", to: "filled" },
        ],
      },
    },
  },
  conditions: {
    emptyContents: (data, payload, result) => {
      if (!result?.contents) {
        return true;
      } else {
        return false;
      }
    },
    noContents: (data, payload) => {
      if (!payload?.contents) {
        return true;
      } else {
        return false;
      }
    },
    noContentsInData: (data) => {
      if (!data?.contents) {
        return true;
      } else {
        return false;
      }
    },
  },
  actions: {
    loadContents: (data, payload, result) => {
      data.contents = result.contents;
    },
    setContents: (data, payload, result) => {
      data.contents = payload.contents;
    },
    setError: (data, payload, error) => {
      data.error = error;
    },
  },
  asyncs: {
    readFile: async (data): Promise<{ contents: string | null }> => {
      throw new Error("not implemented");
    },
    writeFile: async (data): Promise<void> => {
      throw new Error("not implemented");
    },
  },
});

export const useFile = (
  path: string,
  {
    transform,
    defaultTransformedData,
  }: {
    transform?: (contents) => any;
    defaultTransformedData?: any;
  } = {}
) => {
  const resource = useStateDesigner(
    {
      ...resourceDesign,
      data: { ...resourceDesign.data, path },
      asyncs: {
        ...resourceDesign.asyncs,
        readFile: async (data) => {
          try {
            const contents = fs.readFileSync(data.path).toString();
            return {
              contents: contents,
            };
          } catch (e) {
            return {
              contents: null,
            };
          }
        },
        writeFile: async (data) => {
          await mkdirp(pathUtils.dirname(data.path));
          fs.writeFileSync(data.path, data.contents);
        },
      },
      values: {
        transformed: (data) => {
          if (data.contents === null) {
            return defaultTransformedData;
          } else {
            return transform?.(data.contents) ?? data.contents;
          }
        },
      },
    },
    [path]
  );

  React.useEffect(() => {
    resource.send("READ_FILE");
  }, [resource.send]);

  return resource;
};

export const WriteFile = ({ path, contents }) => {
  const resource = useFile(path);
  const fileSystem = useFileSystem();

  React.useEffect(() => {
    fileSystem.touchFile(path, contents);
  }, [path]);

  function executeFn() {
    return new Promise((resolve, reject) => {
      const cancel = resource.onUpdate((state) => {
        if (
          state.isIn("empty") ||
          (state.isIn("filled.not_writing") && contents !== state.data.contents)
        ) {
          state
            .send("SET_CONTENTS", { contents: contents })
            .then((nextState) => {
              nextState.send("WRITE_FILE");
            });
        } else if (
          state.isIn("filled.written") &&
          contents === state.data.contents
        ) {
          cancel();
          resolve();
        } else if (state.isIn("filled.error")) {
          cancel();
          reject(state.data.error);
        }
      });
    });
  }

  return <Task onRun={executeFn} name={path} />;
};
