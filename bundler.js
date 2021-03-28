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
  return {
    filename,
    dependentcies,
    code
  }
}

const makeDependenciesGraph = (entry) => {
  const entryModule = moduleAnalyser(entry);
  const graphArray = [entryModule];
  for(let i=0;i<graphArray.length;i++){
    const item = graphArray[i];
    const {dependentcies} = item;
    if(dependentcies){
      for(let j in dependentcies){
        graphArray.push(
          moduleAnalyser(dependentcies[j])
        );
      }
    }
  }
  const gragh = {};
  graphArray.forEach(item => {
    gragh[item.filename] = {
      dependentcies: item.dependentcies,
      code: item.code
    }
  })
  return gragh;
}

const generateCode = (entry) => {
  // console.log(makeDependenciesGraph(entry));
  const graph = JSON.stringify(makeDependenciesGraph(entry));
  return `
    (function(grap){
      function require(module){
        function localRequire(relativePath){
          return require(graph[module].dependentcies[relativePath]);
        }
        var exports = {};
        (function(require, exports, code){
          eval(code)
        })(localRequire, exports, graph[module].code);
        return exports;
      };
      require('${entry}')
    })(${graph})
  `;
}

const code = generateCode('./src/index.js');
console.log(code);

// 大致步骤：
// 1、分析入口文件，函数moduleAnalyser
// 2、拿到入口文件名，先去读取文件内容，然后借助@babel/parser来把读取回来的字符串转化成抽象语法树。
// 3、分析抽象语法树中声明所在位置，通过ImportDeclaration找到import语句对应的内容，找到后分析里面的依赖内容并拼装为一个js对象放到dependentcies，这个变量存储所有的依赖关系
// 4、将ast树转换成浏览器可以执行的代码
// 5、最终返回入口名字，依赖关系，打包源码
// 6、之前的步骤只是实现了分析一个模块，现在开始遍历src下所有的模块，把每一个模块的情况都通过analyser分析好，然后存储起来，存储后数组依赖图谱，并为了打包方便，将数组转换为对象，并返回该对象。