/* MAGASIN Scheduling V2 — calendar-week navigation in Vietnam business time.
 * Date-only values use UTC calendar arithmetic; never infer weekdays from the
 * viewer's local timezone. No network calls and no scheduling mutations.
 */
(()=>{
  'use strict';
  if(window.MAGASIN_SCHEDULING_V2_WEEK_NAV)return;
  const parse=value=>{
    const text=String(value||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;
    const date=new Date(text+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===text?date:null;
  };
  const dateOffset=(value,days)=>{
    const date=parse(value);
    if(!date||!Number.isInteger(days))return '';
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  };
  const weekStart=value=>{
    const date=parse(value);
    return date?dateOffset(value,-((date.getUTCDay()+6)%7)):'';
  };
  const shiftWeek=(value,weeks)=>{
    const monday=weekStart(value);
    return monday&&Number.isInteger(weeks)?dateOffset(monday,weeks*7):'';
  };
  const todayVN=()=>{
    const parts=Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const fields=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  };
  const currentWeek=(today=todayVN())=>weekStart(today);
  const nextWeek=(today=todayVN())=>shiftWeek(today,1);
  const format=value=>value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4);
  const rangeLabel=value=>{
    const start=weekStart(value),end=start&&dateOffset(start,6);
    return end?'T2 '+format(start)+' – CN '+format(end):'Chưa chọn tuần hợp lệ';
  };
  window.MAGASIN_SCHEDULING_V2_WEEK_NAV=Object.freeze({
    weekStart,dateOffset,shiftWeek,currentWeek,nextWeek,rangeLabel,todayVN
  });
})();
