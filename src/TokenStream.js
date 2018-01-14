function anyOf(cs) {
    return c => cs.indexOf(c) !== -1
}

function noneOf(cs) {
    return c => cs.indexOf(c) === -1
}

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

    readStr() {
        const value = this.readUntil(c => {
            return this.charStream.isEnd ||
            (c === '{' && anyOf('{%')(this.charStream.peek(1)))
        })
        return { type: 'string', value }
    }

    readControlExpr(type) {
        switch (type) {
            case 'for':
                return this.readFor()
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