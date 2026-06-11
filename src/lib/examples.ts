export interface Example {
  id: string;
  label: string;
  description: string;
  source: string;
  transform: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "rename-variable",
    label: "Rename variable",
    description: "Rename all occurrences of a variable identifier",
    source: `const oldName = 'hello';
console.log(oldName);
function greet() {
  return oldName + ' world';
}`,
    transform: `module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.Identifier, { name: 'oldName' })
    .replaceWith(() => j.identifier('newName'))
    .toSource();
};`,
  },
  {
    id: "arrow-to-function",
    label: "Arrow → function declaration",
    description: "Convert arrow function variables to named function declarations",
    source: `const greet = (name) => {
  return 'Hello, ' + name;
};

const add = (a, b) => a + b;`,
    transform: `module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  root.find(j.VariableDeclaration).filter(path => {
    const decl = path.node.declarations[0];
    return decl && (
      decl.init?.type === 'ArrowFunctionExpression'
    );
  }).replaceWith(path => {
    const decl = path.node.declarations[0];
    const name = decl.id.name;
    const arrow = decl.init;
    const body = arrow.body.type === 'BlockStatement'
      ? arrow.body
      : j.blockStatement([j.returnStatement(arrow.body)]);
    return j.functionDeclaration(
      j.identifier(name),
      arrow.params,
      body
    );
  });

  return root.toSource();
};`,
  },
  {
    id: "console-log-remove",
    label: "Remove console.log",
    description: "Strip all console.log calls from the source",
    source: `function doWork() {
  console.log('Starting...');
  const result = 42;
  console.log('Result:', result);
  return result;
}`,
    transform: `module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.ExpressionStatement, {
      expression: {
        type: 'CallExpression',
        callee: { object: { name: 'console' }, property: { name: 'log' } },
      },
    })
    .remove()
    .toSource();
};`,
  },
  {
    id: "require-to-import",
    label: "require → import",
    description: "Convert CommonJS require() to ESM import statements",
    source: `const fs = require('fs');
const path = require('path');
const { readFile } = require('fs/promises');`,
    transform: `module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  root.find(j.VariableDeclaration).filter(path => {
    const decl = path.node.declarations[0];
    return decl?.init?.type === 'CallExpression' &&
      decl.init.callee.name === 'require';
  }).replaceWith(path => {
    const decl = path.node.declarations[0];
    const source = decl.init.arguments[0].value;
    const id = decl.id;
    if (id.type === 'ObjectPattern') {
      return j.importDeclaration(
        id.properties.map(p => j.importSpecifier(j.identifier(p.key.name))),
        j.stringLiteral(source)
      );
    }
    return j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(id.name))],
      j.stringLiteral(source)
    );
  });

  return root.toSource();
};`,
  },
];
