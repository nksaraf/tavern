import { useMemo } from "react";
import deepEqual from "fast-deep-equal";

export type PromiseCache = {
  promise: Promise<any>;
  args: any;
  error?: any;
  response?: any;
};

export interface PromiseFunction<T | undefined, V> {
  (props?: T): Promise<V>;
}

function handleAsset<T, V>(
  fn: PromiseFunction<T, V>,
  cache: PromiseCache[],
  args: T,
  lifespan = 0,
  preload = false
): V {
  for (const entry of cache) {
    // Find a match
    if (deepEqual(args, entry.args)) {
      // If an error occurred, throw
      if (entry.error) throw entry.error;
      // If a response was successful, return
      if (entry.response !== undefined) return entry.response;
      // If the promise is still unresolved, throw
      throw entry.promise;
    }
  }

  // The request is new or has changed.
  const entry: PromiseCache = {
    args,
    promise:
      // Make the promise request.
      fn(args)
        .then((response) => (entry.response = response))
        .catch((e) => (entry.error = e))
        .then(() => {
          if (lifespan > 0) {
            setTimeout(() => {
              const index = cache.indexOf(entry);
              if (index !== -1) cache.splice(index, 1);
            }, lifespan);
          }
        }),
  };
  cache.push(entry);
  if (!preload) throw entry.promise;
}

function clear(cache: PromiseCache[], args: any) {
  if (args === undefined) cache.splice(0, cache.length);
  else {
    const entry = cache.find((entry) => deepEqual(args, entry.args));
    if (entry) {
      const index = cache.indexOf(entry);
      if (index !== -1) cache.splice(index, 1);
    }
  }
}

function createAsset<T, V>(fn: PromiseFunction<T, V>, lifespan: number = 0) {
  const cache: PromiseCache[] = [];
  return {
    read: (args: T) => handleAsset(fn, cache, args, lifespan),
    preload: (args: T) => void handleAsset(fn, cache, args, lifespan, true),
    clear: (args: T) => clear(cache, args),
    cache,
    peek: (args: T) =>
      cache.find((entry) => deepEqual(args, entry.args))?.response,
  };
}

let globalCache: PromiseCache[] = [];

function useAsset<T, V>(fn: PromiseFunction<T, V>, args: T): V {
  return useMemo(() => handleAsset(fn, globalCache, args, useAsset.lifespan), [
    args,
  ]);
}

useAsset.lifespan = 0;
useAsset.clear = (args: any) => clear(globalCache, args);
useAsset.preload = function <T, V>(fn: PromiseFunction<T, V>, args: T) {
  void handleAsset(fn, globalCache, args, useAsset.lifespan, true);
};
useAsset.peek = (args: any) =>
  globalCache.find((entry) => deepEqual(args, entry.args))?.response;

export { createAsset, useAsset };
