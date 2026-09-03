/* MAGASIN Workforce day header V1 */
(function(document){
  'use strict';
  if(document.getElementById('wfd-day-header-fix-v1')) return;
  var style=document.createElement('style');
  style.id='wfd-day-header-fix-v1';
  style.textContent='.wfd4-day-main{display:flex!important;align-items:center!important;gap:0!important}.wfd4-day-main strong,.wfd4-day-main span{font-size:14px!important;font-weight:800!important;line-height:1.2!important;color:var(--text)!important}.wfd4-day-main span{color:var(--text)!important}.wfd4-day-main span::before{content:" - ";white-space:pre}.wfd4-day-main strong{white-space:nowrap}.wfd4-day-main span{white-space:nowrap}';
  (document.head||document.documentElement).appendChild(style);
})(document);
