


const Success = Symbol("Success");
const Failure = Symbol("Failure");
const Running = Symbol("Running");
const Pending = Symbol("Pending");



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

        this.execute();

        ++this.env[0].ip;
    }

    //console.log("[env]", this.env);

    this.dropEnv();
}



Kent.prototype.execute = function (first) {

    let token = this.env[0].code[this.env[0].ip];

    if (token.type === "number") return new ReturnValue(Success, "number", token.number, true);

    if (token.type === "string") return new ReturnValue(Success, "string", token.string, true);

    if (token.type === "cmd") {

        if (!token.gen) token.gen = this.cmd[token.cmd].newGen();

        return this.backtrack(token.gen, this.cmd[token.cmd].param.length, [], this.env[0].ip);
    }

    return new ReturnValue(Failure);
}

// à un moment il faut dire à une branche de repartir à zéro, mais quand ?
// différence entre l'appel à backtrack depuis execute / depuis backtrack ?

Kent.prototype.backtrack = function(gen, argLeft, argSoFar, ip) {

    if (argLeft > 0) { // we're currently collecting arguments recursively

        let result = new ReturnValue(Pending);
        let newArg = new ReturnValue(Pending);

        while (!result.last && result.outcome !== Success) {

            this.env[0].ip = ip+1
            newArg = this.execute();

            if (newArg.outcome === Failure) return new ReturnValue(Failure);

            let oneMoreArg = argSoFar.concat([newArg]);
            
            result = this.backtrack(gen, argLeft - 1, oneMoreArg, this.env[0].ip);
        }
        return result;

    } else { // we're done collecting arguments

        let result = new ReturnValue(Pending);

        while (!result.last && result.outcome !== Success) {
            result = gen.exec(argSoFar);
        }
        return result;
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

        if (this.typeError(args, this.param))
            return new ReturnValue(Failure);

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
        true
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

    console.log("[range iterator]", iter);

    return new ReturnValue(
        Success,
        "number",
        args[0].value + iter,
        iter >= args[1].value
    )
});



Kent.prototype.register("add", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        Success,
        "number",
        args[0].value + args[1].value,
        true
    )
});



Kent.prototype.register("lt", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        args[0].value < args[1].value ? Success : Failure,
        "number",
        args[1],
        true
    )
});



Kent.prototype.register("gt", ["number", "number"], function (args, iter) {

    return new ReturnValue(
        args[0].value > args[1].value ? Success : Failure,
        "number",
        args[1],
        true
    )
});








