import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../../05_MANAGER/Workforce/manager-five-board-v4.js',import.meta.url),'utf8');
test('XSTORE-019J slide-over preserves dominant calendar and canonical editor',()=>{
 for(const x of ['.x19g-side-drawer','grid-template-columns:minmax(0,1fr)!important','function x19jShowSlide','data-msd-open-editor','data-msd-row','wrap.appendChild(editor)','x19jInstallSlideEvents','x19jCloseSlide','data-x19g-board="check"'])assert.ok(src.includes(x),x);
 assert.match(src,/if\(isReadOnly\)\{/);
 assert.match(src,/editor\.open=true/);
 assert.match(src,/e\.stopImmediatePropagation\(\)/);
 assert.match(src,/e\.key==='Escape'/);
 assert.match(src,/\.msd-cluster-row,\.msd-direct-card,\.msd-cluster-head/);
});
