const CharStream = require('./CharStream')
const TokenStream = require('./TokenStream')

function compileTemplate(str) {
    const tokenStream = new TokenStream(new CharStream(str))
    const stack = []

    while (!tokenStream.isEnd) {
        stack.push(tokenStream.next())
    }

    return function applyTemplate(data) {
        let out = ''
        let nextToken

        while((nextToken = stack.shift())) {
            const { type, value } = nextToken
            if (type === 'var') {
                out += data[value] || ''
            } else {
                out += value
            }
        }

        return out
    }
}

module.exports = compileTemplate