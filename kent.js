//const enolib = require('enolib');



/*
const codeBlockEnoType = src => {

    return Kent.prototype.buildAST(src);
};

enolib.register({ codeBlockEnoType });
*/



const Success = Symbol("Success");
const Failure = Symbol("Failure");
const Running = Symbol("Running");


/*
    types:
    seq =       composite
    goal =      composite
    loop =      decorator
    while =     decorator
    until =     decorator
    succeed =   terminal
    fail =      terminal
*/



function Kent(src) {

    this.env = [];

    if (src) this.buildAST(src);
}



Kent.prototype.baseArity = {

    "succeed": 0,
    "fail": 0,
    "js": 1,
    "while": 1,
    "until": 1,
    "seq": 1,
    "goal": 1,
    "all": 1,

    "log": 1,
    "add": 2
}



Kent.prototype.buildAST = function (src) {

    this.ast = enolib.parse(src).raw();

    this.codeParseAST(this.ast);

    this.decorateWithParentsAST(this.ast);

    return this.ast;
}



Kent.prototype.traverseEno = function(node, callback, parent) {

    callback.call(this, node, parent);

    let children = node.elements || node.entries || node.items || node.code || node.group || node.path;

    if (children) for (let c = 0; c < children.length; c++) {
        
        this.traverseEno(children[c], callback, node);
    }
}



Kent.prototype.codeParseAST = function (ast) {

    this.traverseEno(ast, function(node, parent) {

        try {
            if ("value" in node) node.code = codeParser.parse(node.value);
        } catch(e) {
            // log("[parser]", e.message);
        }
    });
}



Kent.prototype.decorateWithParentsAST = function (ast) {

    this.traverseEno(ast, function(node, parent) {

        node.parent = parent;
    });
}



Kent.prototype.step = function () {

    this.traverseEno(this.ast, function(node, parent) {

        if (node.key === "script" && node.code) {

            this.executeScript(node.code);
        }
    });
}



Kent.prototype.executeScript = function (rawcode) {

    let code = rawcode.slice(0);

    this.newEnv();
    
    while (this.env[0].ip < code.length) {

        let token = Object.assign(
            {},
            code[this.env[0].ip],
            { arity: this.getArity(code[this.env[0].ip]) }
        );

        if (token.arity > 0)
            this.env[0].cmds.unshift(token);
        else
            this.env[0].args.unshift(token);

        if (this.env[0].args.length >= this.env[0].cmds[0].arity) {

            let args = this.env[0].args.slice(0, this.env[0].cmds[0].arity);
            this.env[0].args = this.env[0].args.slice(this.env[0].cmds[0].arity);

            let cmd = this.env[0].cmds[0];
            this.env[0].cmds.shift();

            let result = this.execute(cmd, args);
            
            if (Array.isArray(result)) code.splice(this.env[0].ip + 1, 0, ...result);
        }

        ++this.env[0].ip;
    }

    this.dropEnv();
}



Kent.prototype.execute = function(cmd, args) {

    return this.execBuiltin(cmd, args);
}



Kent.prototype.execBuiltin = function(cmd, args) {

    if (cmd.path.length === 1 && this.builtin[cmd.path[0]])
        return this.builtin[cmd.path[0]](args);
    else
        return null;
}



Kent.prototype.builtin = {};



Kent.prototype.builtin.log = function(args) {

    let txt = args[0].number || args[0].string || args;
    console.log("[builtin log]", txt);
    log(txt);
}



Kent.prototype.builtin.add = function(args) {

    let sum = args[0].number + args[1].number;
    console.log("[builtin add]", sum);
    return [{
        type: "number",
        number: sum
    }];
}



Kent.prototype.dropEnv = function () {

    this.env.shift();
}



Kent.prototype.newEnv = function () {

    this.env.unshift({
        ip: 0,
        cmds: [],
        args: []
    });
}



Kent.prototype.getArity = function (token) {

    if (token.type !== "path") return 0;

    if (token.path.length > 1) return 0; // HERE FETCH STUFF ../../../..

    return this.baseArity[token.path[0]] || 0;
}



function BTNode(type, parent, content) {

    this.type = type;
    this.parent = parent;
    this.children = [];
    this.content = content;
    if (parent) this.parent.children.push(this);
}



BTNode.prototype.tick = function () {

    return this.typedTick[this.type](this);
}



BTNode.prototype.typedTick = {};



BTNode.prototype.typedTick["js"] = function (node) {

    window.thisNode = node;

    try {

        return {
            value: eval(node.content.js),
            outcome: Success
        };

    } catch (err) {

        return {
            error: err,
            outcome: Failure
        };

    }
}



BTNode.prototype.typedTick["while"] = function (node) {

    if (node.children.length === 0) return { outcome: Failure };

    let status = { outcome: Success };
    let c = 0;

    while (status.outcome === Success) {

        status = node.children[c].tick();
        ++c;
        if (c >= node.children.length) c = 0;
    }
    return { outcome: Success };
}



BTNode.prototype.typedTick["until"] = function (node) {

    if (node.children.length === 0) return { outcome: Failure };

    let status = { outcome: Success };
    let c = 0;

    while (status.outcome !== Success) {

        status = node.children[c].tick();
        ++c;
        if (c >= node.children.length) c = 0;
    }
    return { outcome: Success };
}



BTNode.prototype.typedTick["seq"] = function (node) {

    for (let child of node.children) {

        let childStatus = child.tick();

        if (childStatus.outcome === Running || childStatus.outcome === Failure) return childStatus;
    }
    return { outcome: Success };
}



BTNode.prototype.typedTick["goal"] = function (node) {

    for (let child of node.children) {

        let childStatus = child.tick();

        if (childStatus.outcome === Running || childStatus.outcome === Success) return childStatus;
    }
    return Failure;
}



BTNode.prototype.typedTick["all"] = function (node) {

    let successCount = 0;
    let threshold = (node.content && node.content.threshold) || 1;

    for (let child of node.children) {

        if (child.tick().outcome === Success) ++successCount;
    }

    return { outcome: (successCount >= threshold) ? Success : Failure };
}



