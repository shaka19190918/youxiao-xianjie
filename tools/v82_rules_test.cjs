const assert=require('node:assert/strict'),R=require('../pinyin-rules-v82.js');
for(const name of R.whole){const x=R.analyze(name);assert.equal(x.kind,'whole',name);assert.deepEqual(x.parts,[name])}
for(const [name,parts] of Object.entries({ba:['b','a'],ke:['k','e'],ji:['j','i'],jue:['j','ve'],jun:['j','vn'],lv:['l','v'],lve:['l','ve']}))assert.deepEqual(R.analyze(name).parts,parts,name);
for(const [name,parts] of Object.entries({gua:['g','u','a'],guo:['g','u','o'],kuai:['k','u','ai'],xian:['x','i','an'],jiang:['j','i','ang'],juan:['j','v','an'],xiong:['x','i','ong']})){assert.equal(R.analyze(name).kind,'three',name);assert.deepEqual(R.analyze(name).parts,parts,name)}
for(const name of ['ya','wo','you','wei','yang'])assert.equal(R.analyze(name).kind,'spelling',name);
for(const name of ['a','ai','ang','er'])assert.equal(R.analyze(name).kind,'zero',name);
for(const name of ['https://bad.example','<script>','bzzz'])assert.equal(R.analyze(name).kind,'unsupported');
console.log('PASS whole/2-part/3-part/ü spelling/zero initial/unsupported cases');
