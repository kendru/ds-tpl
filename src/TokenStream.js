function or(...fns) {
    return c => {
        for (let fn of fns) {
            if (fn(c)) return true
        }
        return false
    }
}

function isChar(cCompare) {
    return c => c === cCompare
}

function anyOf(cs) {
    return c => cs.indexOf(c) !== -1
}

function noneOf(cs) {
    return c => cs.indexOf(c) === -1
}

function inRange(c1, c2) {
    const cLow = c1.charCodeAt(0)
    const cHigh = c2.charCodeAt(0)

    return c => c.charCodeAt(0) >= cLow && c.charCodeAt(0) <= cHigh
}

const isQuote = anyOf('\'"')
const isOperator = anyOf('=!&|')
const isIdentStart = or(isChar('_'), inRange('a', 'z'), inRange('A', 'Z'))
const isNumeral = inRange('0', '9')
const isIdentChar = or(isIdentStart, isNumeral)

class TokenStream {

    constructor(charStream) {
        this.charStream = charStream
        this.cachedToken = null
    }

    pos() {
        return this.charStream.pos
    }

    peek() {
        if (this.charStream.isEnd) {
            return null
        }
        return this.cachedToken || (this.cachedToken = this.readNext())
    }

    next() {
        const nextToken = this.cachedToken
        this.cachedToken = null
        return nextToken || this.readNext()
    }

    get isEnd() {
        return this.peek() === null
    }

    readNext() {
        if (this.charStream.isEnd) {
            return null
        }

        const nextChar = this.charStream.peek()
        if (nextChar == '{') {
            if (this.charStream.peek(1) === '{') {
                return this.readVar()
            } else if (this.charStream.peek(1) === '>') {
                return this.readPartial()
            } else if (this.charStream.peek(1) === '%') {
                return this.readControl()
            }
        }

        return this.readStr()
    }

    readVar() {
        this.readCharSeq('{{')
        this.consumeWhitespace()
        const value = this.readWhile(c => ' }'.indexOf(c) === -1)
        this.consumeWhitespace()
        this.readCharSeq('}}')

        return { type: 'var', value }
    }

    readControl() {
        this.readCharSeq('{%')
        this.consumeWhitespace()
        const exprType = this.readWhile(noneOf('% '))
        this.consumeWhitespace()
        const expr = this.readControlExpr(exprType)
        this.consumeWhitespace()
        this.readCharSeq('%}')

        return expr
    }

    readPartial() {
        this.readCharSeq('{>')
        this.consumeWhitespace()
        const val = this.readWhile(noneOf(' }'))
        this.consumeWhitespace()
        this.readCharSeq('}')

        return { type: 'partial', val }
    }

    readStr() {
        const value = this.readUntil(c => {
            return this.charStream.isEnd ||
            (c === '{' && anyOf('{%>')(this.charStream.peek(1)))
        })
        return { type: 'string', value }
    }

    readControlExpr(type) {
        switch (type) {
            case 'for':
                return this.readFor()
            case 'if':
                return this.readIf()
            case 'else':
                return { type: 'else' }
            case 'end':
                return { type: 'end' }
            default:
                this.panic(`Unknown control type: ${type}`, 'for, end')
        }
    }

    readFor() {
        const iter = this.readWhile(c => c !== ' ')
        this.consumeWhitespace()
        this.readCharSeq('as')
        this.consumeWhitespace()
        const binding = this.readWhile(noneOf('% '))
        this.consumeWhitespace()
        
        return { type: 'for', iter, binding }
    }

    readIf() {
        let expr = []
        let nextChild
        while(nextChild = this.readExprToken()) {
            expr.push(nextChild)
        }
        this.consumeWhitespace()

        return { type: 'if', expr }
    }

    readExprToken() {
        const nextChar = this.charStream.peek()
        let out = null
        if (isQuote(nextChar)) {
            out = this.readStringLiteral()
        } else if (isNumeral(nextChar)) {
            out = this.readNumber()
        } else if (isOperator(nextChar)) {
            out = this.readOperator()
        } else if (isIdentStart(nextChar)) {
            out = this.readIdentifier()
        }

        this.consumeWhitespace()

        return out
    }

    readStringLiteral() {
        const quoteChar = this.charStream.next()
        // We do not support string escaping
        let val = this.readWhile(c => c !== quoteChar)
        this.charStream.next()

        return { type: 'string-literal', val }
    }

    readNumber() {
        let val = this.readWhile(isNumeral)
        if (this.charStream.peek() === '.') {
            val += this.charStream.next() + this.readWhile(isNumeral)
        }

        return { type: 'number', val }
    }

    readOperator() {
        let opChar = this.charStream.next()
        let nextChar = this.charStream.peek()

        switch (opChar) {
            case '=':
                if (nextChar !== '=') {
                    this.panic('Unknown operator', '=')
                }
                this.charStream.next()
                return { 'type': 'operator', val: '==' }
            case '!':
                if (nextChar !== '=') {
                    this.panic('Unknown operator', '=')
                }
                this.charStream.next()
                return { 'type': 'operator', val: '!=' }
            case '&':
                if (nextChar !== '&') {
                    this.panic('Unknown operator', '&')
                }
                this.charStream.next()
                return { 'type': 'operator', val: '&&' }
            case '|':
                if (nextChar !== '|') {
                    this.panic('Unknown operator', '|')
                }
                this.charStream.next()
                return { 'type': 'operator', val: '||' }
            default:
                this.panic('Unrecognized operator character')
        }
    }

    readIdentifier() {
        return { type: 'identifier', val: this.readWhile(isIdentChar) }
    }

    consumeWhitespace() {
        this.readWhile(c => c === ' ')
    }

    readWhile(pred) {
        let out = ''

        while(pred(this.charStream.peek())) {
            out += this.charStream.next()
        }

        return out
    }

    readUntil(pred) {
        return this.readWhile(c => !pred(c))
    }

    readChar(c) {
        if (this.charStream.peek() !== c) {
            this.panic('Error reading character', c)
        }
        return this.charStream.next()
    }

    readCharSeq(cs) {
        for (let c of cs) {
            this.readChar(c)
        }

        return cs // If we did not panic, we are guaranteed to have read the input
    }

    panic(msg, expected) {
        if (expected) {
            msg += '; expected: ' + expected
        }
        this.charStream.panic(msg)
    }
}

module.exports = TokenStream