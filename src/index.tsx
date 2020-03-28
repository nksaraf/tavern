// import _ from 'lodash';

const React = (function() {
  let hooks: any[] = [];
  let hookIndex = 0;

  function createElement(type: any, props: any, ...children: any) {
    return { type, props: { ...props, children } };
    // return type({ ...props, children });
  }

  const HELLO = 1;
  function useState(initialValue: any) {
    const _index = hookIndex;
    const state = hooks[_index] || initialValue;
    const setState = (newValue: any) => {
      hooks[_index] = newValue;
    };
    hookIndex++;
    return [state, setState];
    HELLO;
  }

  function render(vnode: any) {
    hookIndex = 0;
    if (typeof vnode === 'string') {
      return document.createTextNode(vnode);
    }

    if (typeof vnode.type === 'string') {
      // element.console // const C = Component();
      let node = document.createElement(vnode.type);

      for (let name in Object(vnode.props)) {
        node.setAttribute(name, vnode.props[name]);
      }

      for (let i = 0; i < vnode.children.length; i++) {
        node.appendChild(render(vnode.children[i]));
      }
    }

    render(vnode.type(vnode.props));
  }

  function useEffect(callback: () => any, dependencies: any[] | undefined = undefined) {
    const _index = hookIndex;
    const oldDependencies = hooks[_index];
    let hasChanged = true;
    if (oldDependencies) {
      hasChanged = (dependencies as any[]).some((dep, i) => !Object.is(dep, oldDependencies[i]));
    }
    if (hasChanged) {
      callback();
    }
    hooks[_index] = dependencies;
    hookIndex++;
  }

  return { useState, render, useEffect, createElement };
})();

// function Com() {
//   return <h1>World</h1>;
// }

function C() {
  return (
    <h1>
      <span>Hello</span>World
    </h1>
  );
}

function Component() {
  const [count, setCount] = React.useState(1);
  const [text, setText] = React.useState('apple');
  React.useEffect(() => {
    console.log('effect');
  }, [text]);
  return <C />;
}

var root = document.getElementById('root');
root && root.(React.render(<Component />));
// App.click();
// var App = React.render(Component);
// App.type('pear');
// var App = React.render(Component);
