class TokenStream {

    constructor(charStream) {
        this.charStream = charStream
        this.cachedToken = null
    }

    peek() {
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
        if (nextChar == '{' && this.charStream.peek(1) == '{') {
            return this.readVar()
        }

        return this.readStr()
    }

    readVar() {
        this.readWhile(c => '{ '.indexOf(c) > -1)
        const value = this.readWhile(c => ' }'.indexOf(c) === -1)
        this.readWhile(c => c === ' ')
        this.readWhile(c => c === '}')

        return { type: 'var', value }
    }

    readStr() {
        const value = this.readUntil(c => this.charStream.isEnd || (c === '{' && this.charStream.peek(1) === '{'))
        return { type: 'string', value }
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
}

module.exports = TokenStream