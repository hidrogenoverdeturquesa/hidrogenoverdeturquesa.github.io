const {test}=require('node:test');
const assert=require('node:assert/strict');
const {generate,validate,csv,designCsv,matrix,resultValue,protocol,numeric,example}=require('../js/diseno-experimentos.js');
const valid=(extra={})=>({...example,calculation:'manual',rawCount:'0',feasible:true,...extra});

test('complete factorials contain every condition exactly once per independent replicate',()=>{
    for(let count=1;count<=4;count++)for(const reps of [2,3,10]) {
        const p=generate(valid({factorCount:String(count),repetitions:String(reps),factorName3:'Lugar',factorType3:'category',factorLow3:'Sala A',factorHigh3:'Sala B',factorName4:'Suelo',factorType4:'category',factorLow4:'Arenoso',factorHigh4:'Arcilloso'}));
        assert.equal(p.rows.length,2**count*reps);
        for(let r=1;r<=reps;r++)assert.equal(new Set(p.rows.filter(x=>x.replica===r).map(x=>JSON.stringify(x.values))).size,2**count);
        assert.deepEqual(p.rows.map(r=>r.run),Array.from({length:p.rows.length},(_,i)=>i+1));
        assert.ok(p.rows.every(r=>r.result===''&&r.note===''));
    }
});
test('seed preserves order and changes it when changed',()=>{
    assert.deepEqual(generate(valid()).rows,generate(valid()).rows);
    assert.notDeepEqual(generate(valid()).rows,generate(valid({seed:'2027'})).rows);
});
test('complete blocks keep all treatments together and randomize within each block',()=>{
    const p=generate(valid({blocking:'replicate',blockName:'Día'}));
    for(let b=1;b<=3;b++) {
        const rows=p.rows.slice((b-1)*4,b*4);
        assert.ok(rows.every(r=>r.block===b));
        assert.deepEqual(rows.map(r=>r.condition).sort(),[1,2,3,4]);
    }
});
test('invalid or incomplete factors are rejected instead of silently removed',()=>{
    for(const change of [{factorHigh2:''},{factorName2:'masa de cobertura de fibras'},{factorLow1:'1',factorHigh1:'1.0'},{factorLow1:'3',factorHigh1:'2'},{factorLow1:'Infinity'},{factorCount:'5'},{factorUnit1:''},{repetitions:'2.5'},{seed:'0'},{blocking:'replicate',blockName:''},{feasible:false}]) {
        assert.ok(validate(valid(change)).length,JSON.stringify(change));
        assert.throws(()=>generate(valid(change)));
    }
    assert.ok(validate(valid({factorType1:'category',factorLow1:' Blanco ',factorHigh1:'blanco'})).length);
});
test('decimal commas normalize and category labels remain text',()=>{
    const p=generate(valid({factorLow1:'-1,5',factorHigh1:'2,5'}));
    assert.deepEqual(p.factors[0].levels,[-1.5,2.5]);
    assert.ok(Number.isNaN(numeric('1,000.50')));
    assert.ok(Number.isNaN(numeric('')));
    assert.equal(numeric('0'),0);
});
test('CSV retains zero, empty results, units, notes and safe user text',()=>{
    const p=generate(valid({response:'=FORMULA()',factorType1:'category',factorLow1:'@danger',factorHigh1:'normal'}));
    p.rows[0].result='0';p.rows[0].note='=1+1';p.rows[1].result='1,5';p.rows[1].note='Una nota, con "comillas"\ny otra línea';
    const text=csv(p);
    assert.ok(text.startsWith('\ufeff'));
    assert.ok(text.includes("\"'=FORMULA() (g)\""));
    assert.ok(text.includes("\"'@danger\""));
    assert.ok(text.includes('"0","\'=1+1"'));
    assert.ok(text.includes('"1.5"'));
    assert.ok(text.includes('"comillas""'));
    p.rows[0].result='bad';assert.throws(()=>csv(p));
});
test('protocol contains actionable decisions and every run',()=>{
    const p=generate(valid({blocking:'replicate',blockName:'Día'}));const txt=protocol(p);
    for(const k of ['question','hypothesis','experimentalUnit','measurement','meaningfulDifference','constants','materials','procedure','stopRules'])assert.ok(txt.includes(p.data[k]),k);
    assert.ok(txt.includes('12. Grupo 3'));assert.ok(txt.includes('120 minutos'));
    assert.ok(txt.includes('no garantiza detectar'));assert.ok(txt.includes('no añade corridas'));
});
test('standard matrix maps codes to levels independently of randomized run order',()=>{
    const p=generate(valid({factorCount:'4',factorName3:'C',factorType3:'numeric',factorLow3:'0',factorHigh3:'1',factorUnit3:'g',factorName4:'D',factorType4:'category',factorLow4:'A',factorHigh4:'B'}));
    const m=matrix(p);assert.equal(m.length,16);assert.equal(p.rows.length,48);
    assert.deepEqual(m[0].codes,[-1,-1,-1,-1]);assert.deepEqual(m[15].codes,[1,1,1,1]);
    for(const row of m)row.values.forEach((v,i)=>assert.equal(v,p.factors[i].levels[(row.codes[i]+1)/2]));
    for(const row of p.rows)assert.deepEqual(row.values,m[row.condition-1].values);
    assert.equal(designCsv(p).split('\r\n').length,17);
});
test('HVT example calculates only from two valid observations and preserves measured conditions',()=>{
    const p=generate({...example,feasible:true}),r=p.rows[0];
    assert.equal(resultValue(p,r),'');r.raw[0]='650';assert.equal(resultValue(p,r),'');
    r.raw[1]='625,5';assert.equal(resultValue(p,r),'24.5');
    r.actual[0]='9,8';r.actual[1]='101';r.unitId='M-001';r.date='2026-09-06T09:00';r.status='done';
    const exported=csv(p);assert.ok(exported.includes('"9.8","101","650","625.5","24.5"'));assert.ok(exported.includes('M-001'));
    r.raw=['0','0'];assert.equal(resultValue(p,r),'0');
    r.raw=['bad','0'];assert.equal(resultValue(p,r),'');assert.throws(()=>csv(p));
    assert.ok(protocol(p).includes('2^k'));assert.ok(protocol(p).includes('Masa inicial del conjunto - Masa del conjunto a las 24 h'));
});
test('derived response requires matching units and complete raw column definitions',()=>{
    for(const extra of [{rawCount:'1'},{rawUnit2:'kg'},{responseUnit:'kg'},{rawName2:''},{rawName2:example.rawName1}])assert.ok(validate({...example,feasible:true,...extra}).length);
    assert.deepEqual(validate({...example,feasible:true}),[]);
    assert.ok(validate({...example,feasible:true,rawUnit1:'mW',rawUnit2:'MW',responseUnit:'mW'}).length);
});
