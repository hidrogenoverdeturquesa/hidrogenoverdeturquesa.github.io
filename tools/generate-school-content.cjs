const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const portal=path.resolve(root,'../h2vt-portal');
const sourcePath=path.join(root,'data/escuela/courses.v1.json');
const htmlPath=path.join(root,'escuela.html');
const tsPath=path.join(portal,'src/content/school-courses.generated.ts');
const check=process.argv.includes('--check');
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));

if(source.schemaVersion!==1||!Array.isArray(source.courses)||source.courses.length!==4)throw new Error('El catálogo debe contener exactamente cuatro cursos en schemaVersion 1.');
const ids=new Set(),orders=new Set();
for(const course of source.courses){
 if(!/^[a-z0-9-]+$/.test(course.id)||ids.has(course.id))throw new Error(`ID inválido o repetido: ${course.id}`);
 if(!Number.isInteger(course.order)||orders.has(course.order))throw new Error(`Orden inválido o repetido: ${course.order}`);
 if(course.status!=='published'||!course.publicPath.startsWith('/curso-')||!course.workbookPath.startsWith('/cuadernillos/salidas/')||!Number.isInteger(course.lessonCount)||course.lessonCount<1)throw new Error(`Curso incompleto: ${course.id}`);
 for(const publicResource of [course.publicPath,course.workbookPath])if(!fs.existsSync(path.join(root,publicResource.slice(1))))throw new Error(`Recurso pÃºblico inexistente: ${publicResource}`);
 ids.add(course.id);orders.add(course.order);
}
source.courses.sort((a,b)=>a.order-b.order);

const visuals={
 'microbit-energy-sensors':{image:'images/Microbit.png',alt:'Tarjeta Micro:bit',aria:'Ver curso Micro:bit',width:1448,height:1086},
 'esp32-monitoring-data':{image:'images/Esp32.png',alt:'Tarjeta ESP32',aria:'Ver curso ESP32',width:1254,height:1254},
 'electrolyzers-safety':{image:'images/Electrolizador.png',alt:'Equipo electrolizador',aria:'Ver curso Electrolizadores',width:1254,height:1254},
 'organics-microbiology-fermentation':{image:'images/Fermentacion%20Oscura.png',alt:'Representación de un sistema de fermentación oscura',aria:'Ver curso Orgánicos y fermentación',width:1536,height:1024}
};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cards=source.courses.map(course=>{
 const visual=visuals[course.id];if(!visual)throw new Error(`Falta presentación pública para ${course.id}`);
 const href=course.publicPath.slice(1),tags=course.tags.map(tag=>`<span>${esc(tag)}</span>`).join('');
 return `        <article class="school-card" data-course-id="${course.id}" data-category="${course.category.id}" data-level="${course.level.id}"><a class="school-card-image" href="${href}" aria-label="${esc(visual.aria)}"><img src="${visual.image}" alt="${esc(visual.alt)}" loading="lazy" width="${visual.width}" height="${visual.height}"><span>${esc(course.level.label)}</span></a><div class="school-card-copy"><p class="school-overline">${esc(course.category.label)} / ${course.lessonCount} lecciones</p><h3><a href="${href}">${esc(course.title)}</a></h3><p>${esc(course.description)}</p><p class="school-result"><strong>Tu reto:</strong> ${esc(course.challenge)}</p><div class="school-tags">${tags}</div><div class="school-card-actions"><a class="school-course-link" href="${href}">Entrar al curso</a><a class="school-course-link school-workbook-link" href="${course.workbookPath.slice(1)}">Descargar cuadernillo</a></div></div></article>`;
}).join('\n');
const block=`<!-- SCHOOL_COURSES:START -->\n${cards}\n        <!-- SCHOOL_COURSES:END -->`;
const html=fs.readFileSync(htmlPath,'utf8');
const pattern=/<!-- SCHOOL_COURSES:START -->[\s\S]*?<!-- SCHOOL_COURSES:END -->/;
if(!pattern.test(html))throw new Error('No se encontraron los marcadores del catálogo público.');
const expectedHtml=html.replace(pattern,block);
const ts=`// Generated from hidrogenoverdeturquesa.github.io/data/escuela/courses.v1.json. Do not edit.\nexport const schoolContentVersion=${source.schemaVersion} as const;\nexport const schoolCourses=${JSON.stringify(source.courses,null,2)} as const;\n`;

function sync(file,current,expected){
 if(check){if(current!==expected)throw new Error(`Contenido académico desactualizado: ${file}`);return;}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,expected,'utf8');
}
sync(htmlPath,html,expectedHtml);
sync(tsPath,fs.existsSync(tsPath)?fs.readFileSync(tsPath,'utf8'):'',ts);
console.log(`${check?'Verificación':'Generación'} académica: 4 cursos, IDs únicos y dos interfaces sincronizadas.`);
