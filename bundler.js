const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

const moduleAnalyser = (filename) => {
  const content = fs.readFileSync(filename, 'utf-8');
  const ast = parser.parse(content, {
    sourceType: "module"
  })
  const dependentcies = {};
  traverse(ast, {
    ImportDeclaration({
      node
    }) {
      const dirname = path.dirname(filename);
      const newFile = './' + path.join(dirname, node.source.value);
      dependentcies[node.source.value] = newFile;
    }
  })
  const {
    code
  } = babel.transformFromAst(ast, null, {
    presets: ['@babel/preset-env']
  });
  console.log(code);
  return {
    filename,
    dependentcies,
    code
  }
}

moduleAnalyser('./src/index.js');

// 大致步骤：
// 1、分析入口文件，函数moduleAnalyser
// 2、拿到入口文件名，先去读取文件内容，然后借助@babel/parser来把读取回来的字符串转化成抽象语法树。
// 3、分析抽象语法树中声明所在位置，通过ImportDeclaration找到import语句对应的内容，找到后分析里面的依赖内容并拼装为一个js对象放到dependentcies，这个变量存储所有的依赖关系
// 4、将ast树转换成浏览器可以执行的代码
// 5、最终返回入口名字，依赖关系，打包源码