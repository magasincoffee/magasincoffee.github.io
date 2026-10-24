import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = p => readFile(new URL('../../' + p, import.meta.url), 'utf8');
const actor = {
  profile_status: 'ACTIVE', employee_role: 'EMPLOYEE',
  employee_id: 'employee-one', priority_store_ids: ['store-one']
};
const base = {
  storeId: 'store-one', weekStart: '2026-10-19',
  employeeId: 'employee-one', confirmed: true, reason: 'Điều chỉnh ca',
  workDate: '2026-10-19', startTime: '05:00', endTime: '05:30'
};

async function harness(path, responses) {
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (!Object.prototype.hasOwnProperty.call(responses, name)) {
        throw Error('Unexpected RPC ' + name);
      }
      return { data: responses[name], error: null };
    }
  };
  const window = {
    location: { search: '?post-publish-preview' },
    MAGASIN_SCHEDULING_V2_POST_PUBLISH_PREVIEW_ENABLED: true,
    MAGASIN_SCHEDULING_V2_CONTEXT: {
      actor: async () => ({ role: 'STORE_MANAGER' }),
      stores: async () => [{ id: 'store-one' }],
      client: () => client
    }
  };
  vm.runInNewContext(await read(path), { window, URLSearchParams }, { timeout: 1000 });
  return { window, calls };
}

test('Post-publication additions reject out-of-hours and quarter-hour input before any writer RPC', async () => {
  const { window, calls } = await harness('05_MANAGER/SchedulingV2/post-publish-v1.js', {
    list_employee_workforce_profiles_v1: [actor],
    add_published_shift_v1: { saved: true }
  });
  const service = window.MAGASIN_SCHEDULING_V2_POST_PUBLISH;
  for (const times of [
    ['04:30', '06:00'], ['07:15', '08:00'],
    ['21:30', '22:30'], ['06:00', '06:45'], ['05:60', '06:30'], ['06:00','06:60']
  ]) {
    await assert.rejects(
      service.mutate({ ...base, mode: 'ADD', startTime: times[0], endTime: times[1] }),
      /INVALID_TIME_SLOT|INVALID_SHIFT/
    );
  }
  assert.equal(calls.some(x => x.name === 'add_published_shift_v1'), false);
  const ok = await service.mutate({ ...base, mode: 'ADD' });
  assert.equal(ok.saved, true);
  assert.equal(calls.filter(x => x.name === 'add_published_shift_v1').length, 1);
});

test('Draft add/replace guards enforce 05:00–22:00 and 30-minute increments without writes', async () => {
  const { window, calls } = await harness('05_MANAGER/SchedulingV2/draft-operations-v1.js', {
    list_schedule_generations: [{ id: 'generation-one', status: 'DRAFT' }],
    get_schedule_generation_assignments: [],
    list_employee_workforce_profiles_v1: [actor],
    get_cross_store_weekly_plan_v1: [],
    replace_schedule_generation_assignments: { saved: true },
    validate_schedule_generation_v1: { valid: true, violations: [], warnings: [] }
  });
  const service = window.MAGASIN_SCHEDULING_V2_DRAFT_OPERATIONS;
  const assignment = { user_id: 'employee-one', work_date: '2026-10-19', start_time: '04:30', end_time: '06:00' };
  for (const times of [
    ['04:30','06:00'], ['07:15','08:00'], ['21:30','22:30'], ['06:00','06:45'], ['05:60','06:30'], ['06:00','06:60']
  ]) {
    await assert.rejects(
      service.apply({ storeId:'store-one', weekStart:'2026-10-19', operation:'add', assignment:{ ...assignment, start_time:times[0], end_time:times[1] } }),
      /INVALID_TIME_SLOT|INVALID_ASSIGNMENT/
    );
  }
  assert.equal(calls.some(x => x.name === 'replace_schedule_generation_assignments'), false);
  const ok=await service.apply({
    storeId:'store-one', weekStart:'2026-10-19', operation:'add',
    assignment:{ ...assignment, start_time:'05:00', end_time:'05:30' }
  });
  assert.equal(ok.saved, true);
  assert.equal(calls.filter(x => x.name === 'replace_schedule_generation_assignments').length, 1);
});

test('All visible scheduling time forms use identical half-hour boundaries', async () => {
  const [draft,post,demand] = await Promise.all([
    read('05_MANAGER/SchedulingV2/editor-ui-v1.js'),
    read('05_MANAGER/SchedulingV2/post-publish-ui-v1.js'),
    read('05_MANAGER/SchedulingV2/Demand/index.html')
  ]);
  for (const html of [draft, post]) {
    // These are visible 24h choices, not locale-dependent native time widgets.
    assert.match(html, /<select name="start" required aria-label="Giờ bắt đầu \(24 giờ\)"/);
    assert.match(html, /<select name="end" required aria-label="Giờ kết thúc \(24 giờ\)"/);
    assert.match(html, /for\(const \[name,first,last\] of \[\['start',300,1290\],\['end',330,1320\]\]\)/);
    assert.match(html, /for\(let minute=first;minute<=last;minute\+=30\)/);
    assert.match(html, /option\.value=hh\+':'\+mm;option\.textContent=option\.value/);
    assert.doesNotMatch(html, /<input type="time" name="(?:start|end)"/);
    assert.match(html, /start\.value/);
    assert.match(html, /end\.value/);
  }
  // Demand now uses fixed HH:mm options instead of platform-dependent AM/PM time widgets.
  const slots = id => {
    const contents = demand.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)<\\/select>'))?.[1] || '';
    return [...contents.matchAll(/<option value="(\d{2}:\d{2})"/g)].map(x=>x[1]);
  };
  const start = slots('sv2BandStart'), end = slots('sv2BandEnd');
  const time = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  assert.deepEqual(start,Array.from({length:34},(_,i)=>time(300+i*30)));
  assert.deepEqual(end,Array.from({length:34},(_,i)=>time(330+i*30)));
  assert.doesNotMatch(demand,/type="time"/);
  assert.match(post, /mode==='ADD'&&!validSlot\(\)/);
  assert.match(post, /05:00–22:00/);
  assert.ok(post.includes(String.raw`/^(\d{2}):(\d{2})$/`), 'post-publish UI parses HH:MM with digits');
});
