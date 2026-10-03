(()=>{
'use strict';
const panel=document.getElementById('panel-publish');
if(!panel)return;
const stores=[
 {id:'store-a',code:'CN1',name:'94 Đường 3/2'},
 {id:'store-b',code:'CN2',name:'163 Nguyễn Văn Cừ'},
 {id:'store-c',code:'CN3',name:'82A Nguyễn Văn Cừ'},
 {id:'store-d',code:'CN4',name:'60 Trần Hưng Đạo'}
];
let state={storeId:'store-a',week:'2026-09-28',stores,availability:[],assignments:[],officialRows:[],generationStatus:'NONE',busy:false};
function render(){
 panel.innerHTML='<section class="card msd" data-scheduling-actor="OWNER"><div class="row"><div><h3>Giám sát xếp lịch</h3><p class="muted">Theo dõi cửa hàng đã chọn và thực hiện quy trình xếp lịch tuần.</p></div><span class="badge">OWNER</span></div><div class="row"><select id="msdStore">'+stores.map(s=>'<option value="'+s.id+'"'+(s.id===state.storeId?' selected':'')+'>'+s.code+' · '+s.name+'</option>').join('')+'</select><button id="msdReload">Làm mới</button><button id="msdStart">Tạo bản nháp</button><button id="msdSave">Lưu bản nháp</button></div><div class="card"><strong>Thời gian nhân viên có thể làm</strong><p class="muted">Chi tiết lập lịch dùng cùng quy trình với Quản lý.</p></div></section>';
 panel.querySelector('#msdStore')?.addEventListener('change',e=>{state.storeId=e.target.value});
}
async function openDirect(detail={}){
 if(detail.storeId)state.storeId=detail.storeId;
 if(detail.week)state.week=detail.week;
 render();
}
render();
globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT={
 openDirect,
 async refresh(){render()},
 getState:()=>({...state,stores:stores.map(x=>({...x}))})
};
})();