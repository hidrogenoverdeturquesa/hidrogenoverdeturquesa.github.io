const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');

test('canonical school content matches both generated interfaces',()=>{
 const result=spawnSync(process.execPath,[path.join(__dirname,'generate-school-content.cjs'),'--check'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/escuela/courses.v1.json'),'utf8'));
 assert.equal(data.courses.length,4);assert.equal(new Set(data.courses.map(course=>course.id)).size,4);
 for(const course of data.courses){
  const courseHtml=fs.readFileSync(path.join(root,course.publicPath.slice(1)),'utf8');
  assert.equal(fs.existsSync(path.join(root,course.workbookPath.slice(1))),true,`${course.id}: workbook missing`);
  const numberedLessons=new Set([...courseHtml.matchAll(/id="leccion-(\d+)"/g)].map(match=>match[1]));
  assert.equal(numberedLessons.size+1,course.lessonCount,`${course.id}: lesson count differs from ${course.publicPath}`);
 }
});

test('public catalog filters generated courses by topic and level',()=>{
 const html=fs.readFileSync(path.join(root,'escuela.html'),'utf8'),script=fs.readFileSync(path.join(root,'js/escuela.js'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://hidrogenoverdeturquesa.com/escuela#catalogo'});dom.window.eval(script);
 const {document,Event}=dom.window,cards=[...document.querySelectorAll('.school-card')];assert.equal(cards.length,4);
 assert.equal(document.querySelector('.school-button-secondary')?.getAttribute('href'),'https://cuenta.hidrogenoverdeturquesa.com/#escuela');
 assert.equal(document.querySelectorAll('.school-workbook-link').length,4);
 const category=document.querySelector('#school-category');category.value='hydrogen';category.dispatchEvent(new Event('change'));assert.equal(cards.filter(card=>!card.hidden).length,1);
 category.value='all';category.dispatchEvent(new Event('change'));const level=document.querySelector('#school-level');level.value='Aplicado';level.dispatchEvent(new Event('change'));assert.equal(cards.filter(card=>!card.hidden).length,1);
 assert.equal(document.querySelector('#school-count').textContent,'1 curso disponible');
});
