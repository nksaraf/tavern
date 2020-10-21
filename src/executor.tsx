import React from "react";
import { createDesign, useStateDesigner, S } from "state-designer";
import { runTasks, TaskFn } from "./task";
import { useValueRef } from "usables/useValueRef";
import { IndentedText, IndentProvider } from "./indent";
import Spinner from "ink-spinner";

export const executorDesign = createDesign({
  initial: "idle",
  data: {
    tasks: [],
    result: null,
    error: null,
  },
  states: {
    idle: {
      on: {
        ADD_TASK: {
          do: "addTask",
        },
        EXECUTE: {
          to: "executing",
        },
      },
    },
    executing: {
      async: {
        await: "doWork",
        onResolve: { to: "success", do: "setResult" },
        onReject: { to: "error", do: "setError" },
      },
    },
    success: {},
    error: {},
  },
  actions: {
    addTask: (data, payload) => {
      data.tasks.push(payload.task);
    },
    setResult: (data, payload, result) => {
      data.result = result;
    },
    setError: (data, payload, error) => {
      data.error = error;
    },
  },
  asyncs: {
    doWork: async (data, payload) => {
      const maxParallel = payload.parallel
        ? payload.maxParallel ?? data.tasks.length
        : 1;
      return await runTasks(data.tasks, {
        maxParallel,
        continueOnError:
          typeof payload.continueOnError === "boolean"
            ? payload.continueOnError
            : payload.parallel
            ? true
            : false,
      });
    },
  },
  values: {
    numberOfTasks: (data) => {
      return data.tasks.length;
    },
  },
});

export type Executor = S.StateWithDesign<typeof executorDesign> & {
  parent?: S.StateWithDesign<typeof executorDesign> | null;
  execute?: TaskFn | null;
  silent?: boolean;
  addTask?: (task: TaskFn) => void;
};

export const ExecutorContext = React.createContext<Executor | null>(null);

export function useExecutor() {
  const executor = React.useContext(ExecutorContext);
  if (!executor) {
    return null;
  }

  const state = useStateDesigner(executor) as Executor;
  return state;
}

type ExecutionOptions = {
  parallel?: boolean;
  continueOnError?: boolean;
  maxParallel?: number;
};

export const Executor = React.forwardRef<
  Executor,
  {
    children: React.ReactNode;
    silent?: boolean;
    verbose?: boolean;
    executeOnRender?: boolean;
    label?: string;
    indented?: boolean;
    joinParent?: boolean;
  } & ExecutionOptions
>(function Executor(
  {
    children,
    silent = false,
    verbose = false,
    label = undefined,
    indented = true,
    joinParent = true,
    executeOnRender = true,
    ...options
  },
  ref
) {
  const parentExecutor = useExecutor();
  const executor = useStateDesigner(executorDesign) as Executor;

  const execute = React.useCallback(
    async (options = {}) => {
      return new Promise((resolve, reject) => {
        const cancel = executor.onUpdate((state) => {
          if (state.isIn("success")) {
            cancel();
            resolve(state.data.result);
          } else if (state.isIn("error")) {
            cancel();
            reject(state.data.error);
          }
        });
        executor.can("EXECUTE") && executor.send("EXECUTE", options);
      });
    },
    [executor?.send]
  );

  const addTask = React.useCallback(
    (task) => {
      executor?.send("ADD_TASK", {
        task,
      });
    },
    [executor?.send]
  );

  silent = silent
    ? true
    : parentExecutor?.silent
    ? verbose
      ? false
      : true
    : false;

  const finalExecutor = {
    ...executor,
    execute,
    addTask,
    parent: parentExecutor,
    silent,
  };

  if (ref) {
    if (typeof ref === "function") {
      ref(finalExecutor);
    } else {
      ref.current = finalExecutor;
    }
  }

  return (
    <ExecutorContext.Provider value={finalExecutor as Executor}>
      {label && !executor.silent && <Execution label={label} />}
      <IndentProvider indented={indented}>{children}</IndentProvider>
      {!parentExecutor && executeOnRender && <Execute {...options} />}
      {parentExecutor && joinParent && <ExecutionTask {...options} />}
    </ExecutorContext.Provider>
  );
});

export function Execution({ label = "tasks" }) {
  const executor = useExecutor();

  return (
    <IndentedText
      dimColor={executor.isIn("idle")}
      bold
      color={executor.whenIn({
        executing: "blue",
        success: "green",
        error: "red",
        idle: "white",
      })}
    >
      {executor.whenIn({
        executing: <Spinner />,
        success: "✔",
        error: "✖",
        idle: "o",
      })}{" "}
      {label}
    </IndentedText>
  );
}

export function Execute({ ...options }: ExecutionOptions) {
  const executor = useExecutor();
  const executorRef = useValueRef(executor.execute);

  React.useEffect(() => {
    executorRef.current(options);
  }, []);

  return null;
}

export function ExecutionTask({ ...options }: ExecutionOptions) {
  const executor = useExecutor();
  const task = useTask(() => executor.execute(options));
  const executeFnRef = useValueRef(task.execute);

  React.useEffect(() => {
    executor.parent.send("ADD_TASK", {
      task: executeFnRef.current,
    });
  }, [executor.parent.send]);

  return null;
}

export const taskDesign = createDesign({
  initial: "idle",
  data: { result: null, error: null },
  states: {
    idle: {
      on: {
        RUN: {
          to: "running",
        },
      },
    },
    running: {
      on: {
        SUCCESS: {
          to: "success",
          do: "setResult",
        },
        ERROR: {
          to: "error",
          do: "setError",
        },
      },
    },
    success: {},
    error: {},
  },
  actions: {
    setResult: (data, payload) => {
      data.result = payload.result;
    },
    setError: (data, payload) => {
      data.error = payload.error;
    },
  },
});

export type Task = S.StateWithDesign<typeof taskDesign> & {
  execute?: TaskFn | null;
};
``;
export function useTask(taskFn: TaskFn) {
  const task = useStateDesigner(taskDesign) as Task;
  const taskFnRef = useValueRef(taskFn);

  const taskExecute = React.useCallback(
    async function taskExecute() {
      task.send("RUN");
      try {
        const result = await taskFnRef.current();
        task.send("SUCCESS", { result: result });
        return result;
      } catch (e) {
        task.send("ERROR", { error: e });
        throw e;
      }
    },
    [task.send]
  );

  task.execute = taskExecute;
  return task as Task;
}

export function Task({ name, onRun, ...props }) {
  const task = useTask(onRun);
  const executor = useExecutor();
  const taskFnRef = useValueRef(task.execute);

  React.useEffect(() => {
    executor.send("ADD_TASK", {
      task: taskFnRef.current,
    });
  }, [executor.send]);

  return (
    !executor.silent && (
      <IndentedText
        dimColor={task.isIn("idle")}
        color={task.whenIn({
          running: "blue",
          success: "green",
          error: "red",
          idle: "grey",
        })}
        {...props}
      >
        {task.whenIn({
          running: <Spinner />,
          success: "✔",
          error: "✖",
          idle: "o",
        })}{" "}
        {name} {task.isIn("error") && task.data.error.message.split("\n")[0]}
      </IndentedText>
    )
  );
}
