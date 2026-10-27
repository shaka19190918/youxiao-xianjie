const assert=require('node:assert/strict'),R=require('../pinyin-rules-v82.js');
const m=require('../assets/pinyin-v63/manifest.json'),b=require('../assets/pinyin-v63/segments-v83.json');
for(const f of m.files){const n=f.file.slice(0,-4);assert.notEqual(R.analyze(n).kind,'unsupported',n);assert.equal(b.files[n].spans.length,4,n)}
for(const [input,expected]of [[' NǏ ','ni'],['nǚ','nv'],['nǜ','nv'],['LÜÈ','lve'],['juǎn','juan'],['guǐ','gui'],['liú','liu'],['ɑ4','a']])assert.equal(R.normalize(input),expected,input);
for(const invalid of ['xyz','abc','wxyz','yzzz','bzzz','https://a.example'])assert.equal(R.analyze(invalid).kind,'unsupported',invalid);
require('./v82_rules_test.cjs');
console.log('PASS all 406 spelling structures; accented search normalization; 1624 available spans');
