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
            return null
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

    return null
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
            out += child.evaluate(environment)
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
        return resolve(environment, this.name) || ''
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

class Parser {
    constructor(tokenStream) {
        this.tokenStream = tokenStream
        this.lastToken = null
        this.stack = []
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
            case 'string':
                return new StringNode(token.value)
            case 'var':
                return new VariableNode(token.value)
            case 'for':
                return new ForNode(token.iter, token.binding, this.windStack('end'))
        }
    }

    windStack(untilType) {
        const stackPos = this.stack.length
        const startToken = this.lastToken

        for (let token; token = this.nextToken();) {
            if (token === null) {
                throw new Error(`Unexpected EOF while reading ${startToken.type} starting at ${startToken.pos.line}:${startToken.pos.col}`)
            }

            if (token.type === untilType) {
                return this.stack.splice(stackPos)
            }

            this.stack.push(this.parseToken(token))
        }
    }
}

module.exports = Parser