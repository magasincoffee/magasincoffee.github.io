/* Keep Employee V40 native navigation. No observer. No polling. */
(function(){
  'use strict';
  const frame=document.getElementById('app');
  if(!frame)return;
  frame.addEventListener('load',function(){
    const child=frame.contentWindow;
    const native=child && child.__MAGASIN_NATIVE_SHOWVIEW;
    if(typeof native==='function'){
      try{child.showView=native;}catch(_){/* ignore */}
    }
  });
})();
