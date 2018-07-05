const CharStream = require('./CharStream')
const TokenStream = require('./TokenStream')

function getIn(bindings, name) {
    let path = name.split('.')
    // Short-circuit for common case of simple name
    if (path.length === 1) {
        return bindings[name]
    }
    let nextName
    let value = bindings

    while (path.length) {
        nextName = path[0]
        path.splice(0, 1)
        value = value[nextName]
        if (typeof value === 'undefined') {
            return undefined
        }
    }

    return value
}

function resolve(env, name) {
    for (let bindings of env) {
        const boundVal = getIn(bindings, name)

        if ((typeof boundVal) !== 'undefined') {
            return boundVal
        }
    }

    return undefined
}

class ASTNode {
    constructor(type) {
        this.type = type
    }

    evaluate(environment) {
        throw new Error(`${this.type} does not implement ASTNode.evaluate()`)
    }
}

class Block extends ASTNode {
    constructor(children = []) {
        super('block')
        this.children = children
    }

    evaluate(environment) {
        let out = ''

        for (let child of this.children) {
            out += child.evaluate(environment) || ''
        }

        return out
    }
}

class StringNode extends ASTNode {
    constructor(value) {
        super('string')
        this.value = value
    }

    evaluate() {
        return this.value
    }
}

class VariableNode extends ASTNode {
    constructor(name) {
        super('variable')
        this.name = name
    }

    evaluate(environment) {
        // Should this throw an exception instead?
        return resolve(environment, this.name)
    }
}

// This node is essentially the same as a StringNode, but it is always evaluated in the context of an expression
// rather than as program output
class StringLiteralNode extends ASTNode {
    constructor(str) {
        super('string-literal')
        this.str = str
    }

    evaluate(environment) {
        return this.str
    }
}

class NumberNode extends ASTNode {
    constructor(n) {
        super('number')
        this.n = n
    }

    evaluate(environment) {
        return parseFloat(this.n)
    }
}

class BooleanNode extends ASTNode {
    constructor(val) {
        super('boolean')
        this.val = val
    }

    evaluate(environment) {
        return this.val === 'true'
    }
}

class ForNode extends ASTNode {
    constructor(iter, binding, children) {
        super('for')
        this.iter = iter
        this.binding = binding
        this.children = children
    }

    evaluate(environment) {
        // pre-allocate a single environment to mutate for each child iteration
        let childEnv = [null, ...environment]
        let out = ''

        const vals = resolve(environment, this.iter)
        if (!vals) {
            throw new Error(`Cannot resolve name, ${this.iter} for iterator`)
        }

        for (let val of vals) {
            childEnv[0] = { [this.binding]: val }
            let subProg = new Block(this.children)
            out += subProg.evaluate(childEnv)
        }

        return out
    }
}

class EqualsNode extends ASTNode {
    constructor(e1, e2) {
        super('==')
        this.e1 = e1
        this.e2 = e2
    }

    evaluate(environment) {
        return this.e1.evaluate(environment) === this.e2.evaluate(environment)
    }
}

class NotEqualsNode extends ASTNode {
    constructor(e1, e2) {
        super('!=')
        this.e1 = e1
        this.e2 = e2
    }

    evaluate(environment) {
        return this.e1.evaluate(environment) !== this.e2.evaluate(environment)
    }
}

class AndNode extends ASTNode {
    constructor(e1, e2) {
        super('&&')
        this.e1 = e1
        this.e2 = e2
    }

    evaluate(environment) {
        return this.e1.evaluate(environment) && this.e2.evaluate(environment)
    }
}

class OrNode extends ASTNode {
    constructor(e1, e2) {
        super('||')
        this.e1 = e1
        this.e2 = e2
    }

    evaluate(environment) {
        return this.e1.evaluate(environment) || this.e2.evaluate(environment)
    }
}

class IfNode extends ASTNode {
    constructor(expr, thenChildren, elseChildren = []) {
        super('if')
        this.expr = expr
        this.thenChildren = thenChildren
        this.elseChildren = elseChildren
    }

    evaluate(environment) {
        const result = this.expr.evaluate(environment)
        let subProg
        subProg = (!!result) ?
            new Block(this.thenChildren) :
            new Block(this.elseChildren)

        return subProg.evaluate(environment)
    }
}

class Parser {

    static forString(str) {
        const charStream = new CharStream(str)
        const tokenStream = new TokenStream(charStream)

        return new Parser(tokenStream)
    }

    constructor(tokenStream, partials = {}) {
        this.tokenStream = tokenStream
        this.lastToken = null
        this.stack = []
        this.partials = {}
    }

    withPartials(partials) {
        this.partials = partials
        return this
    }

    parse() {
        const program = new Block()

        while (!this.tokenStream.isEnd) {
            program.children.push(this.parseToken(this.nextToken()))
        }

        return program
    }

    nextToken() {
        this.lastToken = this.tokenStream.next()
        return this.lastToken
    }

    parseToken(token) {
        switch (token.type) {
            case 'partial':
                const partialStr = this.partials[token.val];
                if (!partialStr) {
                    this.tokenStream.panic(`No partial named ${token.val} registered on parser`)
                }
                return Parser.forString(partialStr).withPartials(this.partials).parse()
            case 'string':
                return new StringNode(token.value)
            case 'var':
                return new VariableNode(token.value)
            case 'for':
                return new ForNode(token.iter, token.binding, this.windStack('end')[0])
            case 'if': {
                const expr = this.parseBooleanExpr(token.expr)
                if (!expr) {
                    this.tokenStream.panic('`if` node does not contain a well-formed boolean expression')
                }
                const [ thenNodes, endType ] = this.windStack('else', 'end')
                const elseNodes = (endType === 'else') ? this.windStack('end')[0] : []
                return new IfNode(expr, thenNodes, elseNodes)
            }
        }
    }

    parseBooleanExpr(tokens) {
        return this.parseCompoundBooleanExpression(tokens) || this.parseSimpleBooleanExpression(tokens)
    }

    parseCompoundBooleanExpression(tokens) {
        if (tokens.length < 2) {
            // there is no compound boolean expression that is a single tokens, e.g. false || true, myVar exists
            return null
        }
        const lhNode = this.parseSimpleBooleanExpression(tokens)
        if (!lhNode) {
            return null
        }
        if (tokens.length === 0) {
            return lhNode
        }

        const op = tokens.shift()
        const rhNode = this.parseCompoundBooleanExpression(tokens)
        switch (op.val) {
            case '&&':
                return new AndNode(lhNode, rhNode)
            case '||':
                return new OrNode(lhNode, rhNode)
            default:
                return null
        }
    }

    // parseCompoundBooleanExpression relies on this mutating tokens and "consuming" it
    parseSimpleBooleanExpression(tokens) {
        const lhs = tokens.shift()
        const lhNode = this.parseBooleanVal(lhs)
        if (tokens.length === 0) {
            return lhNode
        }
        let op = tokens[0]
        switch (op.val) {
            case '==': {
                tokens.shift()
                const rhNode = this.parseBooleanVal(tokens.shift())
                return new EqualsNode(lhNode, rhNode)
            }
            case '!=': {
                tokens.shift()
                const rhNode = this.parseBooleanVal(tokens.shift())
                return new NotEqualsNode(lhNode, rhNode)
            }
            case 'exists': {
                tokens.shift()
                return new NotEqualsNode(lhNode, new VariableNode('undefined'))
            }
            default:
                // Note that a "boolean expression" may be simply a string literal, number, or variable, since we expose
                // JavaScript's native boolean punning
                return lhs
        }
    }

    parseBooleanVal(token) {
        return this.parseBoolean(token) || this.parseStringLiteral(token) || this.parseNumber(token) || this.parseVariable(token);
    }

    parseBoolean(token) {
        if (token.type !== 'identifier') {
            return null
        }

        const normalizedVal = token.val.toLowerCase()
        return  (normalizedVal === 'true' || normalizedVal === 'false') ?
            new BooleanNode(normalizedVal) :
            null
    }

    parseStringLiteral(token) {
        return (token.type === 'string-literal') ?
            new StringLiteralNode(token.val) :
            null
    }

    parseNumber(token) {
        return (token.type === 'number') ?
            new NumberNode(token.val) :
            null
    }

    parseVariable(token) {
        return (token.type === 'identifier') ?
            new VariableNode(token.val) :
            null
    }

    windStack(...tryTypes) {
        const stackPos = this.stack.length
        const startToken = this.lastToken

        for (let token; token = this.nextToken();) {
            if (token === null) {
                throw new Error(`Unexpected EOF while reading ${startToken.type} starting at ${startToken.pos.line}:${startToken.pos.col}`)
            }

            if (tryTypes.indexOf(token.type) !== -1) {
                return [ this.stack.splice(stackPos), token.type ]
            }

            this.stack.push(this.parseToken(token))
        }
    }
}
Parser.partials = Symbol('partials');

module.exports = Parser
