const Parser = require('./Parser')

const globals = {
    undefined: (void 0),
    null: null
};

function compileTemplate(str, partials = {}) {
    const program = Parser.forString(str)
        .withPartials(partials)
        .parse()

    return function applyTemplate(data) {
        let environment = [globals, data]
        return program.evaluate(environment)
    }
}

module.exports = compileTemplate