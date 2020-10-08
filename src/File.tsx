import { Text } from "ink";
import React from "react";
import * as fs from "fs";
const mkdirp = require("mkdirp");
import pathUtils from "path";
import { createContext } from "create-hook-context";
import { useReducerWithEffects } from "usables/useReducerWithEffects";
import { usePersistentStateWithCleanup } from "./persistence";
import { useCleanup } from "./utils";

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

function throwStateError(state, action) {
  throw new Error(
    `Invalid action at state ${state.status}: ${JSON.stringify(action)}`
  );
}

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
  const [state, dispatch] = useReducerWithEffects(
    (state, action, exec) => {
      switch (state.status) {
        case "idle": {
          switch (action.type) {
            case "READ_FILE": {
              exec({ type: "readFile", path: action.path ?? path });
              return {
                ...state,
                path: action.path ?? path,
                status: "reading" as const,
              };
            }
            case "WRITE_FILE": {
              const contents = action.contents ?? state.contents;
              exec({
                type: "writeFile",
                contents,
                path: state.path,
              });
              return {
                ...state,
                contents,
                transformed: transform ? transform(contents) : contents,
                status: "writing" as const,
              };
            }
            default:
              throwStateError(state, action);
          }
        }
        case "filled": {
          switch (action.type) {
            case "READ_FILE": {
              exec({ type: "readFile", path: action.path ?? path });
              return {
                ...state,
                path: action.path ?? path,
                status: "reading" as const,
              };
            }
            case "WRITE_FILE": {
              const contents = action.contents ?? state.contents;
              exec({
                type: "writeFile",
                contents,
                path: state.path,
              });
              return {
                ...state,
                contents,
                transformed: transform ? transform(contents) : contents,
                status: "writing" as const,
              };
            }
            case "SET_CONTENTS": {
              return {
                ...state,
                contents: action.contents,
                transformed: transform
                  ? transform(action.contents)
                  : action.contents,
                status: "filled" as const,
              };
            }
            default:
              throwStateError(state, action);
          }
        }
        case "reading": {
          switch (action.type) {
            case "READ_FILE": {
              if (state.path !== action.path ?? path) {
                exec({ type: "readFile", path: action.path ?? path });
              }
              return {
                ...state,
                path: action.path ?? path,
                status: "reading" as const,
              };
            }
            case "LOAD_CONTENTS": {
              return {
                ...state,
                status: action.contents
                  ? ("filled" as const)
                  : ("empty" as const),
                contents: action.contents,
                transformed: transform
                  ? transform(action.contents)
                  : action.contents,
              };
            }

            default:
              throwStateError(state, action);
          }
        }
        case "writing": {
          switch (action.type) {
            case "FILE_WRITTEN": {
              return {
                ...state,
                status: "filled" as const,
              };
            }
            default:
              throwStateError(state, action);
          }
        }
        case "empty": {
          switch (action.type) {
            case "READ_FILE": {
              exec({ type: "readFile", path: action.path ?? path });
              return {
                ...state,
                path: action.path ?? path,
                status: "reading" as const,
              };
            }
            case "SET_CONTENTS": {
              return {
                ...state,
                contents: action.contents,
                transformed: transform
                  ? transform(action.contents)
                  : action.contents,
                status: "filled" as const,
              };
            }
            case "WRITE_FILE": {
              const contents = action.contents ?? state.contents;
              exec({
                type: "writeFile",
                contents,
                path: state.path,
              });
              return {
                ...state,
                contents,
                transformed: transform ? transform(contents) : contents,
                status: "writing" as const,
              };
            }
            default:
              throwStateError(state, action);
          }
        }
        default:
          throwStateError(state, action);
      }
    },
    {
      path,
      status: "idle" as "reading" | "empty" | "filled" | "writing" | "idle",
      contents: null as string | null,
      transformed: (defaultTransformedData ?? null) as any | null,
    },
    {
      readFile: async (_, effect, dispatch) => {
        try {
          const data = fs.readFileSync(effect.path).toString();
          dispatch({
            type: "LOAD_CONTENTS",
            contents: data,
          });
        } catch (e) {
          dispatch({
            type: "LOAD_CONTENTS",
            contents: null,
          });
        }
      },
      writeFile: async (_, effect, dispatch) => {
        await mkdirp(pathUtils.dirname(path));
        fs.writeFileSync(path, effect.contents);
        dispatch({ type: "FILE_WRITTEN" });
      },
    }
  );

  React.useEffect(() => {
    dispatch({ type: "READ_FILE", path });
  }, [dispatch, path]);

  return {
    ...state,
    dispatch,
  };
};

export function wait(time) {
  return new Promise((res) =>
    setTimeout(() => {
      res();
    }, time)
  );
}

export const File = ({ path, contents }) => {
  const { status, contents: fileContents, dispatch } = useFile(path);
  const fileSystem = useFileSystem();

  React.useEffect(() => {
    fileSystem.touchFile(path, contents);
  }, [path]);

  React.useEffect(() => {
    if (status === "empty") {
      dispatch({ type: "WRITE_FILE", contents: contents });
    } else if (status === "filled" && contents !== fileContents) {
      dispatch({ type: "WRITE_FILE", contents: contents });
    }
  }, [contents, fileContents, status]);

  return (
    <Text>
      {path} {status}
    </Text>
  );
};
