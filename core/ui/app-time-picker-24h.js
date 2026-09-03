(()=>{'use strict';
const pad=n=>String(n).padStart(2,'0');
window.MAGASIN_TIME_PICKER_24H=window.MAGASIN_TIME_PICKER_24H||{
  options:(selected='')=>{let s='';for(let m=0;m<1440;m+=30){const v=`${pad(Math.floor(m/60))}:${pad(m%60)}`;s+=`<option value="${v}"${v===selected?' selected':''}>${v}</option>`}return s}
};
})();
