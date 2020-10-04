"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __defineProperty = Object.defineProperty;
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
var _ink = require('ink'); var ink_star = _interopRequireWildcard(_ink);
var _react = require('react'); var _react2 = _interopRequireDefault(_react);
var _inkspinner = require('ink-spinner'); var _inkspinner2 = _interopRequireDefault(_inkspinner);
var _reacterrorboundary = require('react-error-boundary');
var _jotai = require('jotai'); var jotai_star = _interopRequireWildcard(_jotai);


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
    return /* @__PURE__ */ _react2.default.createElement(_reacterrorboundary.ErrorBoundary, {
      fallbackRender: ({error}) => /* @__PURE__ */ _react2.default.createElement(_ink.Text, null, error.toString())
    }, /* @__PURE__ */ _react2.default.createElement(_react.Suspense, {
      fallback: /* @__PURE__ */ _react2.default.createElement(_inkspinner2.default, {
        type: "dots10"
      })
    }, children));
  };
  function App() {
    return /* @__PURE__ */ _react2.default.createElement(_react2.default.Fragment, null, /* @__PURE__ */ _react2.default.createElement(Execution, null, /* @__PURE__ */ _react2.default.createElement(File, {
      path: "./hello.txt"
    }, "Hello World1")));
  }
  function Env({children}) {
    _react2.default.useEffect(() => {
      return () => {
        try {
          cleanup();
        } catch (e) {
          console.log(e);
        }
      };
    }, []);
    return /* @__PURE__ */ _react2.default.createElement(_react2.default.Fragment, null, children);
  }
  const TavernProvider = ({children}) => {
    return /* @__PURE__ */ _react2.default.createElement(_jotai.Provider, null, /* @__PURE__ */ _react2.default.createElement(_reacterrorboundary.ErrorBoundary, {
      fallbackRender: ({error}) => /* @__PURE__ */ _react2.default.createElement(_ink.Text, null, error.toString())
    }, /* @__PURE__ */ _react2.default.createElement(_react.Suspense, {
      fallback: /* @__PURE__ */ _react2.default.createElement(_ink.Text, null, "Loading env...")
    }, /* @__PURE__ */ _react2.default.createElement(Env, null, children))));
  };
});

// src/jotai.tsx

var _fastdeepequal = require('fast-deep-equal'); var _fastdeepequal2 = _interopRequireDefault(_fastdeepequal);
function atomFamily(initializeRead, initializeWrite, areEqual = _fastdeepequal2.default) {
  const atoms = [];
  const createAtom = (param) => {
    const found = atoms.find((x) => areEqual(x[0], param));
    if (found) {
      return found[1];
    }
    const newAtom = _jotai.atom.call(void 0, initializeRead(param), initializeWrite && initializeWrite(param));
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



var _utilscjs = require('jotai/utils.cjs');





var _fs = require('fs');
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
    const result = _fs.readFileSync.call(void 0, path).toString();
    return {contents: result, status: "filled"};
  } catch (e) {
    return {contents: void 0, status: "empty"};
  }
}, (path) => (get, set, update) => {
  set(fileAtom(path), update);
});
const writeFileAtom = atomFamily((path) => (get) => get(readFileAtom(path)), (path) => async (get, set, contents) => {
  await index.wait(2e3);
  _fs.writeFileSync.call(void 0, path, contents);
  set(readFileAtom(path), {contents, status: "written"});
});
const touchedFiles = {};
function getPrevTouchedFiles() {
  const envContents = _fs.readFileSync.call(void 0, "./.tavern").toString();
  const env = envContents ? JSON.parse(envContents) : [];
  return env;
}
function writeTouchedFilesState(files) {
  _fs.writeFileSync.call(void 0, "./.tavern", JSON.stringify(files));
}
function cleanup() {
  const prevFiles = getPrevTouchedFiles();
  const files = Object.keys(touchedFiles);
  const filesToDelete = prevFiles.filter((e) => !files.find((v) => v === e));
  filesToDelete.forEach((file) => {
    if (_fs.existsSync.call(void 0, file)) {
      _fs.unlinkSync.call(void 0, file);
    }
  });
  writeTouchedFilesState(Object.keys(touchedFiles));
}
const File = ({
  path,
  children
}) => {
  const [oldContents, setContents, status] = useFile(path);
  _react2.default.useEffect(() => {
    setContents(children);
  }, [children]);
  return /* @__PURE__ */ _react2.default.createElement(_ink.Text, null, status);
};
const touchFile = (path, contents) => {
  touchedFiles[path] = contents;
};
function useFile(path) {
  const setAtomValue = _utilscjs.useUpdateAtom.call(void 0, fileAtom(path));
  const [value, setContents] = _jotai.useAtom.call(void 0, writeFileAtom(path));
  return [
    value.contents,
    _react2.default.useCallback((contents) => {
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


function handleAsset(fn, cache, args, lifespan = 0, preload = false) {
  for (const entry2 of cache) {
    if (_fastdeepequal2.default.call(void 0, args, entry2.args)) {
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
    const entry = cache.find((entry2) => _fastdeepequal2.default.call(void 0, args, entry2.args));
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
    peek: (args) => _optionalChain([cache, 'access', _ => _.find, 'call', _2 => _2((entry) => _fastdeepequal2.default.call(void 0, args, entry.args)), 'optionalAccess', _3 => _3.response])
  };
}
let globalCache = [];
function useAsset(fn, args) {
  return _react.useMemo.call(void 0, () => handleAsset(fn, globalCache, args, useAsset.lifespan), [
    args
  ]);
}
useAsset.lifespan = 0;
useAsset.clear = (args) => clear(globalCache, args);
useAsset.preload = function(fn, args) {
  void handleAsset(fn, globalCache, args, useAsset.lifespan, true);
};
useAsset.peek = (args) => _optionalChain([globalCache, 'access', _4 => _4.find, 'call', _5 => _5((entry) => _fastdeepequal2.default.call(void 0, args, entry.args)), 'optionalAccess', _6 => _6.response]);
exports. default = require_src();
