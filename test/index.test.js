const compileTemplate = require('../src/index');
const chai = require('chai');

const { expect } = chai;

describe('Templates', () => {

    it('should compile a simple template into a function', function () {
        const tpl = compileTemplate('Hello {{world}}');
        expect(tpl).to.be.a('function');
    });

    describe('interpolation', function () {

        it('should not interpolate a simple string', function () {
            const input = 'Simple string';
            const tpl = compileTemplate(input);

            expect(tpl({})).to.equal(input);
        });

        it('should interpolate a single variable', function () {
            const tpl = compileTemplate('Hello, {{world}}');

            expect(tpl({ world: 'Earth' })).to.equal('Hello, Earth');
        });

        it('should interpolate multiple variables', function () {
            const tpl = compileTemplate('I am a {{adjective}} {{noun}}');

            expect(tpl({ adjective: 'cheesy', noun: 'taco' })).to.equal('I am a cheesy taco');
        });

        it('should interpolate a variable-only string', function () {
            const tpl = compileTemplate('{{data}}');

            expect(tpl({ data: 'replaced' })).to.equal('replaced');
        });

        it('should interpolate a template starting with string', function () {
            const tpl = compileTemplate('{{greeting}}, you');

            expect(tpl({ greeting: 'здрасти' })).to.equal('здрасти, you');
        });

        it('should interpolate a template ending with string', function () {
            const tpl = compileTemplate('Result: {{result}}');

            expect(tpl({ result: '12' })).to.equal('Result: 12');
        });

        it('should not interpolate a variable that is missing from data', function () {
            const tpl = compileTemplate('Foo is {{foo}}');

            expect(tpl({ bar: 'stuff' })).to.equal('Foo is ');
        });

        it('should handle spaces between the variable delimiters and names', function () {
            const tpl = compileTemplate('Timey {{    stuff }}');

            expect(tpl({ stuff: 'Wimey' })).to.equal('Timey Wimey');
        });
    });
});
