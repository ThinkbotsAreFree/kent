


const Success = Symbol("Success");
const Failure = Symbol("Failure");
const Running = Symbol("Running");
const Pending = Symbol("Pending");



var debugCount = 0;



function Kent(src) {

    this.env = [];

    if (src) this.buildAST(src);
}



Kent.prototype.buildAST = function (src) {

    this.ast = enolib.parse(src).raw();

    this.codeParseAST(this.ast);

    this.decorateWithParentsAST(this.ast);

    return this.ast;
}



Kent.prototype.traverseEno = function (node, callback, parent) {

    callback.call(this, node, parent);

    let children = node.elements || node.entries || node.items || node.code || node.group || node.path;

    if (children) for (let c = 0; c < children.length; c++) {

        this.traverseEno(children[c], callback, node);
    }
}



Kent.prototype.codeParseAST = function (ast) {

    this.traverseEno(ast, function (node, parent) {

        try {

            if ("value" in node) node.code = codeParser.parse(node.value);

        } catch (e) { }
    });
}



Kent.prototype.decorateWithParentsAST = function (ast) {

    this.traverseEno(ast, function (node, parent) {

        node.parent = parent;
    });
}



Kent.prototype.step = function () {

    this.traverseEno(this.ast, function (node, parent) {

        if (node.key === "script" && node.code) {

            this.executeScript(node.code);
        }
    });
}



Kent.prototype.executeScript = function (code) {

    this.newEnv(code);

    while (this.env[0].ip < this.env[0].code.length) {

        this.execute(true);

        ++this.env[0].ip;
    }

    //console.log("[env]", this.env);

    this.dropEnv();
}



Kent.prototype.execute = function (firstExecute) {

    let token = this.env[0].code[this.env[0].ip];

    if (token.type === "number") return new ReturnValue(Success, "number", token.number, true);

    if (token.type === "string") return new ReturnValue(Success, "string", token.string, true);

    if (token.type === "cmd") {

        if (!token.gen) token.gen = this.cmd[token.cmd].newGen();

        let first = firstExecute;
        let result = new ReturnValue(Pending);
        let ip = this.env[0].ip

        while (!result.last && result.outcome !== Success) {

            if (debugCount++ > 100) break;
            this.env[0].ip = ip;
            result = this.backtrack(token.gen, this.cmd[token.cmd].param.length, [], this.env[0].ip, first);
            first = false;
        }
        return result;
    }

    return new ReturnValue(Failure);
}



Kent.prototype.backtrack = function(gen, argLeft, argSoFar, ip, firstBacktrack) {

    if (argLeft > 0) { // we're currently collecting arguments recursively

        let newArg = new ReturnValue(Pending);
        let first = firstBacktrack;

        while (!newArg.last && newArg.outcome !== Success) {

            this.env[0].ip = ip+1
            newArg = this.execute(first);
            first = false;
        }

        if (newArg.outcome === Failure) return new ReturnValue(Failure);

        let oneMoreArg = argSoFar.concat([newArg]);
        
        return this.backtrack(gen, argLeft - 1, oneMoreArg, this.env[0].ip, firstBacktrack);

    } else { // we're done collecting arguments

        return gen.exec(argSoFar, firstBacktrack);
    }
}



Kent.prototype.dropEnv = function () {

    this.env.shift();
}



Kent.prototype.newEnv = function (rawcode) {

    this.env.unshift({
        ip: 0,
        code: rawcode.slice(0)
    });
}



function ReturnValue(outcome, type, value, last) {

    this.outcome = outcome;
    this.type = type;
    this.value = value;
    this.last = last;
}



Kent.prototype.cmd = {};



Kent.prototype.register = function (name, param, exe) {

    this.cmd[name] = new GeneratorFactory(exe, param);
}



function GeneratorFactory(exe, param) {

    this.exe = exe;
    this.param = param;
}



GeneratorFactory.prototype.newGen = function () {

    return new Generator(this.exe);
}



function Generator(exe) {

    this.iter = 0;
    this.exe = exe;

    this.exec = function (args, first) {

        if (first) this.iter = 0;

        if (this.typeError(args, this.param)) {
            ++this.iter;
            return new ReturnValue(Failure);
        }

        let result = this.exe(args, this.iter);
        ++this.iter;
        return result;
    }
}



Generator.prototype.typeError = function (arg, type) {

    // check types
    return false;
}



Kent.prototype.register("log", ["any"], function (args, iter) {

    console.log(args);

    return new ReturnValue(
        Success,
        "void",
        null,
        args[0].last
    )
});



Kent.prototype.register("dump", ["any"], function (args, iter) {

    console.log("[dump iterator]", iter);
    
    console.log(args);

    return new ReturnValue(
        args[0].last ? Success : Failure,
        "void",
        null,
        args[0].last
    )
});



Kent.prototype.register("range", ["number", "number"], function (args, iter) {

    let result = new ReturnValue(
        Success,
        "number",
        args[0].value + iter,
        iter >= args[1].value
    )
    ++iter;
    return result;
});



Kent.prototype.register("add", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        Success,
        "number",
        args[0].value + args[1].value,
        args[0].last && args[1].last
    )
});



Kent.prototype.register("lt", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        args[0].value < args[1].value ? Success : Failure,
        "number",
        args[1].value,
        args[0].last && args[1].last
    )
});



Kent.prototype.register("gt", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        args[0].value > args[1].value ? Success : Failure,
        "number",
        args[1].value,
        args[0].last && args[1].last
    )
});








