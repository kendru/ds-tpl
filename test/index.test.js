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

        it('should be able to evaluate the same template multiple times', function () {
            const tpl = compileTemplate('{{ord}} time');

            expect(tpl({ ord: 'First' })).to.equal('First time');
            expect(tpl({ ord: 'Second' })).to.equal('Second time');
        });

        it('should evaluate a dotted variable as a nested object', function () {
            const tpl = compileTemplate('My name is {{me.name}}');

            expect(tpl({ me: { name: 'Andrew' } })).to.equal('My name is Andrew');
        })
    });

    describe('sequences', function () {
        
        it('should map over an array of scalar values', function () {
            const tpl = compileTemplate('>{%for vals as val%}{{val}},{%end%}<');

            expect(tpl({ vals: [1, 2, 3] })).to.equal('>1,2,3,<');
        });

        it('should map over an array of objects', function () {
            const tpl = compileTemplate('<ul>{%for people as person%}<li>{{person.name}}</li>{%end%}</ul>');
            const people = [
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Carol' }
            ];

            expect(tpl({ people })).to.equal('<ul><li>Alice</li><li>Bob</li><li>Carol</li></ul>');
        });

        it ('should handle nested loops of independent iterators', function () {
            const tpl = compileTemplate('{% for letters as letter %}{% for numbers as number %}{{letter}}/{{number}} {% end %}- {% end %}')
            const data = {
                letters: ['a', 'b'],
                numbers: [1, 2]
            };

            expect(tpl(data)).to.equal('a/1 a/2 - b/1 b/2 - ');
        });

        it('should handle nested loops of dependent iterators', function () {
            const tpl = compileTemplate('{% for people as p %}{{p.name}} likes: {% for p.hobbies as h %}{{h}},{% end %}\n{% end %}')
            const data = {
                people: [
                    {
                        name: 'Andrew',
                        hobbies: ['fitness', 'beer']
                    },
                    {
                        name: 'Diana',
                        hobbies: ['reading', 'watercolour']
                    }
                ]
            };

            expect(tpl(data)).to.equal('Andrew likes: fitness,beer,\nDiana likes: reading,watercolour,\n')
        })
    });
});
