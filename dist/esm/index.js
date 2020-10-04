var __defineProperty = Object.defineProperty;
var __hasOwnProperty = Object.prototype.hasOwnProperty;
var __commonJS = (callback, module) => () => {
  if (!module) {
    module = {exports: {}};
    callback(module.exports, module);
  }
  return module.exports;
};
var __markAsModule = (target) => {
  return __defineProperty(target, "__esModule", {value: true});
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defineProperty(target, name, {get: all[name], enumerable: true});
};
var __exportStar = (target, module) => {
  __markAsModule(target);
  if (typeof module === "object" || typeof module === "function") {
    for (let key in module)
      if (!__hasOwnProperty.call(target, key) && key !== "default")
        __defineProperty(target, key, {get: () => module[key], enumerable: true});
  }
  return target;
};
var __toModule = (module) => {
  if (module && module.__esModule)
    return module;
  return __exportStar(__defineProperty({}, "default", {value: module, enumerable: true}), module);
};

// src/index.tsx
import {Text as Text2} from "ink";
import React2, {Suspense} from "react";
import Spinner from "ink-spinner";
import {ErrorBoundary} from "react-error-boundary";
import {Provider} from "jotai";
import * as jotai_star from "jotai";
import * as ink_star from "ink";
var require_src = __commonJS((exports) => {
  __export(exports, {
    Env: () => Env,
    Execution: () => Execution,
    File: () => File,
    TavernProvider: () => TavernProvider,
    atomFamily: () => atomFamily,
    cleanup: () => cleanup,
    createAsset: () => createAsset,
    default: () => App,
    fileAtom: () => fileAtom,
    touchedFiles: () => touchedFiles,
    useAsset: () => useAsset,
    useFile: () => useFile,
    wait: () => wait2,
    writeFileAtom: () => writeFileAtom
  });
  __exportStar(exports, jotai_star);
  __exportStar(exports, ink_star);
  require("dotenv").config();
  const wait2 = (time) => {
    return new Promise((res) => setTimeout(() => {
      res();
    }, time));
  };
  const Execution = ({children}) => {
    return /* @__PURE__ */ React2.createElement(ErrorBoundary, {
      fallbackRender: ({error}) => /* @__PURE__ */ React2.createElement(Text2, null, error.toString())
    }, /* @__PURE__ */ React2.createElement(Suspense, {
      fallback: /* @__PURE__ */ React2.createElement(Spinner, {
        type: "dots10"
      })
    }, children));
  };
  function App() {
    return /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement(Execution, null, /* @__PURE__ */ React2.createElement(File, {
      path: "./hello.txt"
    }, "Hello World1")));
  }
  function Env({children}) {
    React2.useEffect(() => {
      return () => {
        try {
          cleanup();
        } catch (e) {
          console.log(e);
        }
      };
    }, []);
    return /* @__PURE__ */ React2.createElement(React2.Fragment, null, children);
  }
  const TavernProvider = ({children}) => {
    return /* @__PURE__ */ React2.createElement(Provider, null, /* @__PURE__ */ React2.createElement(ErrorBoundary, {
      fallbackRender: ({error}) => /* @__PURE__ */ React2.createElement(Text2, null, error.toString())
    }, /* @__PURE__ */ React2.createElement(Suspense, {
      fallback: /* @__PURE__ */ React2.createElement(Text2, null, "Loading env...")
    }, /* @__PURE__ */ React2.createElement(Env, null, children))));
  };
});

// src/jotai.tsx
import {atom} from "jotai";
import deepEqual from "fast-deep-equal";
function atomFamily(initializeRead, initializeWrite, areEqual = deepEqual) {
  const atoms = [];
  const createAtom = (param) => {
    const found = atoms.find((x) => areEqual(x[0], param));
    if (found) {
      return found[1];
    }
    const newAtom = atom(initializeRead(param), initializeWrite && initializeWrite(param));
    atoms.unshift([param, newAtom]);
    return newAtom;
  };
  createAtom.remove = (p) => {
    const index2 = atoms.findIndex((x) => x[0] === p);
    if (index2 >= 0) {
      atoms.splice(index2, 1);
    }
  };
  createAtom.atoms = atoms;
  return createAtom;
}

// src/File.tsx
const index = __toModule(require_src());
import {Text} from "ink";
import React from "react";
import {useAtom} from "jotai";
import {useUpdateAtom} from "jotai/utils.cjs";
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "fs";
const fileAtom = atomFamily((path) => ({
  contents: void 0,
  status: "empty"
}));
const readFileAtom = atomFamily((path) => async (get) => {
  const value = get(fileAtom(path));
  if (value.status !== "empty") {
    return value;
  }
  try {
    const result = readFileSync(path).toString();
    return {contents: result, status: "filled"};
  } catch (e) {
    return {contents: void 0, status: "empty"};
  }
}, (path) => (get, set, update) => {
  set(fileAtom(path), update);
});
const writeFileAtom = atomFamily((path) => (get) => get(readFileAtom(path)), (path) => async (get, set, contents) => {
  await index.wait(2e3);
  writeFileSync(path, contents);
  set(readFileAtom(path), {contents, status: "written"});
});
const touchedFiles = {};
function getPrevTouchedFiles() {
  const envContents = readFileSync("./.tavern").toString();
  const env = envContents ? JSON.parse(envContents) : [];
  return env;
}
function writeTouchedFilesState(files) {
  writeFileSync("./.tavern", JSON.stringify(files));
}
function cleanup() {
  const prevFiles = getPrevTouchedFiles();
  const files = Object.keys(touchedFiles);
  const filesToDelete = prevFiles.filter((e) => !files.find((v) => v === e));
  filesToDelete.forEach((file) => {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  });
  writeTouchedFilesState(Object.keys(touchedFiles));
}
const File = ({
  path,
  children
}) => {
  const [oldContents, setContents, status] = useFile(path);
  React.useEffect(() => {
    setContents(children);
  }, [children]);
  return /* @__PURE__ */ React.createElement(Text, null, status);
};
const touchFile = (path, contents) => {
  touchedFiles[path] = contents;
};
function useFile(path) {
  const setAtomValue = useUpdateAtom(fileAtom(path));
  const [value, setContents] = useAtom(writeFileAtom(path));
  return [
    value.contents,
    React.useCallback((contents) => {
      touchFile(path, contents);
      if (contents !== value.contents && Boolean(contents)) {
        setAtomValue({status: "writing", contents: value.contents});
        setContents(contents);
      }
    }, [setAtomValue, value.contents]),
    value.status
  ];
}

// src/use-asset.ts
import {useMemo} from "react";
import deepEqual2 from "fast-deep-equal";
function handleAsset(fn, cache, args, lifespan = 0, preload = false) {
  for (const entry2 of cache) {
    if (deepEqual2(args, entry2.args)) {
      if (entry2.error)
        throw entry2.error;
      if (entry2.response !== void 0)
        return entry2.response;
      throw entry2.promise;
    }
  }
  const entry = {
    args,
    promise: fn(args).then((response) => entry.response = response).catch((e) => entry.error = e).then(() => {
      if (lifespan > 0) {
        setTimeout(() => {
          const index2 = cache.indexOf(entry);
          if (index2 !== -1)
            cache.splice(index2, 1);
        }, lifespan);
      }
    })
  };
  cache.push(entry);
  if (!preload)
    throw entry.promise;
}
function clear(cache, args) {
  if (args === void 0)
    cache.splice(0, cache.length);
  else {
    const entry = cache.find((entry2) => deepEqual2(args, entry2.args));
    if (entry) {
      const index2 = cache.indexOf(entry);
      if (index2 !== -1)
        cache.splice(index2, 1);
    }
  }
}
function createAsset(fn, lifespan = 0) {
  const cache = [];
  return {
    read: (args) => handleAsset(fn, cache, args, lifespan),
    preload: (args) => void handleAsset(fn, cache, args, lifespan, true),
    clear: (args) => clear(cache, args),
    cache,
    peek: (args) => cache.find((entry) => deepEqual2(args, entry.args))?.response
  };
}
let globalCache = [];
function useAsset(fn, args) {
  return useMemo(() => handleAsset(fn, globalCache, args, useAsset.lifespan), [
    args
  ]);
}
useAsset.lifespan = 0;
useAsset.clear = (args) => clear(globalCache, args);
useAsset.preload = function(fn, args) {
  void handleAsset(fn, globalCache, args, useAsset.lifespan, true);
};
useAsset.peek = (args) => globalCache.find((entry) => deepEqual2(args, entry.args))?.response;
export default require_src();
