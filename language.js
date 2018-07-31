function parseExpression(code){
    code=skipSpace(code);
    let match, expr;
    if(match = /^"([^"]*)"/.exec(code)){
        expr={type:"value",value:match[1]}; 
    } else if(match = /^\d+\b/.exec(code)){
        expr={type:"value" , value:match[0]};
    }  else if (match = /^[^\s(),#"]+/.exec(code)) {
        expr = {type: "word", name: match[0]};
    } else {
        throw new SyntaxError("Unexpected syntax: " + code);
    }
    return parseApply(expr,code.slice(match[0].length));
}
function skipSpace(string){
    let first = string.search(/\S/);
    if(first == -1) return "";
    return string.slice(first);
}
function parseApply(expr,code) {
    code=skipSpace(code);
    if(code[0] != "("){
        return {expr: expr,rest:code};
    }
    code = skipSpace(code.slice(1));
    expr={type : "apply",operator:expr,args:[]};
    while(code[0]!=")"){
        let arg = parseExpression(code);
        expr.args.push(arg.expr);
        code=skipSpace(arg.rest);
        if(code[0] ==",") {
            code=skipSpace(code.slice(1));
        }else if(code[0] != ')'){
            throw new SyntaxError("Expected , or ) ");
        }
    }
    return parseApply(expr,code.slice(1));
}
function parse(code){
    let {expr,rest} = parseExpression(code);
    if(skipSpace(rest).length > 0){
        throw new SyntaxError("Unexpected text after code");
    }
    return expr;
}

const specialForms = Object.create(null);

function evaluate(expr,scope){
    if(expr.type =="value"){
        return expr.value;
    } else if(expr.type == "word") {
        if(expr.name in scope){
            return scope[expr.name];
        } else {
            throw new ReferenceError(`Undefined binding ${expr.name}`);
        }
    } else if(expr.type == "apply") {
        let {operator,args}=expr;
        if(operator.type == "word" && operator.name in specialForms){
            return specialForms[operator.name](expr.args,scope);
        } else{
            let op= evaluate(operator,scope);
            if(typeof op == "function"){
                return op(...args.map(arg => evaluate(arg, scope)));
            } else {
                throw new TypeError("Applying a non-function.");
            } 
        }
    }
}

specialForms.if = (args, scope) => {
  if (args.length != 3) {q
    throw new SyntaxError("Wrong number of args to if");
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};
specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError("Wrong number of args to while");
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }
 return false;
};
specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};
specialForms.define = (args, scope) => {
  if (args.length != 2 || args[0].type != "word") {
    throw new SyntaxError("Incorrect use of define");
  }
  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};
const topScope = Object.create(null);
topScope.true=true;
topScope.false=false;

topScope.print = value => { 
    console.log(value);
    return value;
}

for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  topScope[op] = Function("a, b", `return a ${op} b;`);
}

function run(code) {
    return evaluate(parse(code),Object.create(topScope));
}

run(`print("hello world")`);

specialForms.func = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError("Functions need a body");
  }
  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map(expr => {
    if (expr.type != "word") {
      throw new SyntaxError("Parameter names must be words");
    }
    return expr.name;
  });

  return function() {
    if (arguments.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }
    let localScope = Object.create(scope);
    for (let i = 0; i < arguments.length; i++) {
      localScope[params[i]] = arguments[i];
    }
    return evaluate(body, localScope);
  };
};

run(`do(define(hello,func(a,+("hello ",a))),print(hello("Yugandhar")))`)
