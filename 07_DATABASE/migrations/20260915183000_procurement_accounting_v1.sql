-- MAGASIN Procurement & Supplier Payables v1
-- Production migration names already applied: procurement_accounting_v1, procurement_order_integrity_v1
-- This source-controlled migration is the canonical reproducible definition for the module.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['STAFF'::text,'STORE_MANAGER'::text,'INVENTORY_MANAGER'::text,'OWNER'::text,'ACCOUNTANT'::text]));

create sequence if not exists public.procurement_product_code_seq start with 1;
create sequence if not exists public.procurement_supplier_code_seq start with 1;
create sequence if not exists public.procurement_order_no_seq start with 1;

create table if not exists public.procurement_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('MATERIAL','PACKAGING','GOODS','OTHER')),
  base_unit text not null check (base_unit in ('ml','g','cái')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_product_packages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.procurement_products(id),
  label text not null,
  purchase_unit text not null,
  base_qty_per_unit numeric not null check (base_qty_per_unit > 0),
  is_default boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,label)
);

create table if not exists public.procurement_suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  contact_name text,
  phone text,
  email text,
  tax_code text,
  payment_terms_days integer not null default 0 check (payment_terms_days >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  order_date date not null default current_date,
  supplier_id uuid not null references public.procurement_suppliers(id),
  invoice_no text,
  receiving_location text not null default 'KHO_TONG',
  due_date date,
  status text not null default 'POSTED' check (status in ('DRAFT','POSTED','CANCELLED')),
  notes text,
  cancel_reason text,
  posted_at timestamptz,
  cancelled_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.procurement_purchase_orders(id) on delete cascade,
  product_id uuid not null references public.procurement_products(id),
  package_id uuid references public.procurement_product_packages(id),
  product_code_snapshot text not null,
  product_name_snapshot text not null,
  base_unit_snapshot text not null,
  purchase_unit_snapshot text not null,
  quantity numeric not null check (quantity > 0),
  base_qty_per_unit numeric not null check (base_qty_per_unit > 0),
  base_quantity numeric generated always as (quantity * base_qty_per_unit) stored,
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric generated always as (quantity * unit_price) stored,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.procurement_supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.procurement_suppliers(id),
  payment_date date not null default current_date,
  amount numeric not null check (amount > 0),
  method text not null default 'BANK' check (method in ('CASH','BANK','MOMO','OTHER')),
  reference text,
  notes text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','VOID')),
  void_reason text,
  voided_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_supplier_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.procurement_supplier_payments(id) on delete cascade,
  purchase_order_id uuid not null references public.procurement_purchase_orders(id),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(payment_id,purchase_order_id)
);

create table if not exists public.procurement_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_proc_po_date on public.procurement_purchase_orders(order_date);
create index if not exists idx_proc_po_supplier on public.procurement_purchase_orders(supplier_id);
create index if not exists idx_proc_items_order on public.procurement_purchase_order_items(purchase_order_id);
create index if not exists idx_proc_items_product on public.procurement_purchase_order_items(product_id);
create index if not exists idx_proc_payments_supplier_date on public.procurement_supplier_payments(supplier_id,payment_date);
create index if not exists idx_proc_alloc_order on public.procurement_supplier_payment_allocations(purchase_order_id);
create index if not exists idx_proc_audit_entity on public.procurement_audit_log(entity_type,entity_id,created_at desc);

create or replace function public.procurement_set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create or replace function public.procurement_assign_product_code()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_prefix text;
begin
  if new.code is null or btrim(new.code)='' then
    v_prefix:=case new.category when 'MATERIAL' then 'NL' when 'PACKAGING' then 'BB' when 'GOODS' then 'HH' else 'VT' end;
    new.code:=v_prefix||lpad(nextval('public.procurement_product_code_seq')::text,5,'0');
  end if;
  return new;
end $$;

create or replace function public.procurement_assign_supplier_code()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.code is null or btrim(new.code)='' then new.code:='NCC'||lpad(nextval('public.procurement_supplier_code_seq')::text,5,'0'); end if;
  return new;
end $$;

create or replace function public.procurement_audit_row()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  v_id:=case when tg_op='DELETE' then old.id else new.id end;
  insert into public.procurement_audit_log(entity_type,entity_id,action,before_data,after_data,actor_id)
  values(tg_argv[0],v_id,tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid());
  return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function public.procurement_can_access()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='ACTIVE' and p.role in ('OWNER','ACCOUNTANT'));
$$;

-- Technical triggers.
drop trigger if exists trg_proc_products_code on public.procurement_products;
create trigger trg_proc_products_code before insert on public.procurement_products for each row execute function public.procurement_assign_product_code();
drop trigger if exists trg_proc_suppliers_code on public.procurement_suppliers;
create trigger trg_proc_suppliers_code before insert on public.procurement_suppliers for each row execute function public.procurement_assign_supplier_code();
drop trigger if exists trg_proc_products_updated on public.procurement_products;
create trigger trg_proc_products_updated before update on public.procurement_products for each row execute function public.procurement_set_updated_at();
drop trigger if exists trg_proc_packages_updated on public.procurement_product_packages;
create trigger trg_proc_packages_updated before update on public.procurement_product_packages for each row execute function public.procurement_set_updated_at();
drop trigger if exists trg_proc_suppliers_updated on public.procurement_suppliers;
create trigger trg_proc_suppliers_updated before update on public.procurement_suppliers for each row execute function public.procurement_set_updated_at();
drop trigger if exists trg_proc_orders_updated on public.procurement_purchase_orders;
create trigger trg_proc_orders_updated before update on public.procurement_purchase_orders for each row execute function public.procurement_set_updated_at();
drop trigger if exists trg_proc_payments_updated on public.procurement_supplier_payments;
create trigger trg_proc_payments_updated before update on public.procurement_supplier_payments for each row execute function public.procurement_set_updated_at();

drop trigger if exists trg_proc_products_audit on public.procurement_products;
create trigger trg_proc_products_audit after insert or update or delete on public.procurement_products for each row execute function public.procurement_audit_row('PRODUCT');
drop trigger if exists trg_proc_packages_audit on public.procurement_product_packages;
create trigger trg_proc_packages_audit after insert or update or delete on public.procurement_product_packages for each row execute function public.procurement_audit_row('PACKAGE');
drop trigger if exists trg_proc_suppliers_audit on public.procurement_suppliers;
create trigger trg_proc_suppliers_audit after insert or update or delete on public.procurement_suppliers for each row execute function public.procurement_audit_row('SUPPLIER');
drop trigger if exists trg_proc_orders_audit on public.procurement_purchase_orders;
create trigger trg_proc_orders_audit after insert or update or delete on public.procurement_purchase_orders for each row execute function public.procurement_audit_row('PURCHASE_ORDER');
drop trigger if exists trg_proc_items_audit on public.procurement_purchase_order_items;
create trigger trg_proc_items_audit after insert or update or delete on public.procurement_purchase_order_items for each row execute function public.procurement_audit_row('PURCHASE_ORDER_ITEM');
drop trigger if exists trg_proc_payments_audit on public.procurement_supplier_payments;
create trigger trg_proc_payments_audit after insert or update or delete on public.procurement_supplier_payments for each row execute function public.procurement_audit_row('SUPPLIER_PAYMENT');
drop trigger if exists trg_proc_alloc_audit on public.procurement_supplier_payment_allocations;
create trigger trg_proc_alloc_audit after insert or update or delete on public.procurement_supplier_payment_allocations for each row execute function public.procurement_audit_row('PAYMENT_ALLOCATION');

alter table public.procurement_products enable row level security;
alter table public.procurement_product_packages enable row level security;
alter table public.procurement_suppliers enable row level security;
alter table public.procurement_purchase_orders enable row level security;
alter table public.procurement_purchase_order_items enable row level security;
alter table public.procurement_supplier_payments enable row level security;
alter table public.procurement_supplier_payment_allocations enable row level security;
alter table public.procurement_audit_log enable row level security;

-- OWNER/ACCOUNTANT access policies.
drop policy if exists procurement_products_select on public.procurement_products;
create policy procurement_products_select on public.procurement_products for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_products_insert on public.procurement_products;
create policy procurement_products_insert on public.procurement_products for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_products_update on public.procurement_products;
create policy procurement_products_update on public.procurement_products for update to authenticated using(public.procurement_can_access()) with check(public.procurement_can_access());
drop policy if exists procurement_packages_select on public.procurement_product_packages;
create policy procurement_packages_select on public.procurement_product_packages for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_packages_insert on public.procurement_product_packages;
create policy procurement_packages_insert on public.procurement_product_packages for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_packages_update on public.procurement_product_packages;
create policy procurement_packages_update on public.procurement_product_packages for update to authenticated using(public.procurement_can_access()) with check(public.procurement_can_access());
drop policy if exists procurement_suppliers_select on public.procurement_suppliers;
create policy procurement_suppliers_select on public.procurement_suppliers for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_suppliers_insert on public.procurement_suppliers;
create policy procurement_suppliers_insert on public.procurement_suppliers for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_suppliers_update on public.procurement_suppliers;
create policy procurement_suppliers_update on public.procurement_suppliers for update to authenticated using(public.procurement_can_access()) with check(public.procurement_can_access());
drop policy if exists procurement_orders_select on public.procurement_purchase_orders;
create policy procurement_orders_select on public.procurement_purchase_orders for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_orders_insert on public.procurement_purchase_orders;
create policy procurement_orders_insert on public.procurement_purchase_orders for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_orders_update on public.procurement_purchase_orders;
create policy procurement_orders_update on public.procurement_purchase_orders for update to authenticated using(public.procurement_can_access()) with check(public.procurement_can_access());
drop policy if exists procurement_items_select on public.procurement_purchase_order_items;
create policy procurement_items_select on public.procurement_purchase_order_items for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_items_insert on public.procurement_purchase_order_items;
create policy procurement_items_insert on public.procurement_purchase_order_items for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_items_delete on public.procurement_purchase_order_items;
create policy procurement_items_delete on public.procurement_purchase_order_items for delete to authenticated using(public.procurement_can_access());
drop policy if exists procurement_payments_select on public.procurement_supplier_payments;
create policy procurement_payments_select on public.procurement_supplier_payments for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_payments_insert on public.procurement_supplier_payments;
create policy procurement_payments_insert on public.procurement_supplier_payments for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_payments_update on public.procurement_supplier_payments;
create policy procurement_payments_update on public.procurement_supplier_payments for update to authenticated using(public.procurement_can_access()) with check(public.procurement_can_access());
drop policy if exists procurement_alloc_select on public.procurement_supplier_payment_allocations;
create policy procurement_alloc_select on public.procurement_supplier_payment_allocations for select to authenticated using(public.procurement_can_access());
drop policy if exists procurement_alloc_insert on public.procurement_supplier_payment_allocations;
create policy procurement_alloc_insert on public.procurement_supplier_payment_allocations for insert to authenticated with check(public.procurement_can_access());
drop policy if exists procurement_audit_select on public.procurement_audit_log;
create policy procurement_audit_select on public.procurement_audit_log for select to authenticated using(public.procurement_can_access());

grant select,insert,update on public.procurement_products,public.procurement_product_packages,public.procurement_suppliers to authenticated;
grant select,insert,update on public.procurement_purchase_orders to authenticated;
grant select,insert,delete on public.procurement_purchase_order_items to authenticated;
grant select,insert,update on public.procurement_supplier_payments to authenticated;
grant select,insert on public.procurement_supplier_payment_allocations to authenticated;
grant select on public.procurement_audit_log to authenticated;
grant usage,select on sequence public.procurement_product_code_seq,public.procurement_supplier_code_seq,public.procurement_order_no_seq to authenticated;

create or replace view public.v_procurement_order_summary with (security_invoker=true) as
select o.id,o.order_no,o.order_date,o.supplier_id,s.code supplier_code,s.name supplier_name,o.invoice_no,o.receiving_location,o.due_date,o.status,o.notes,o.version,o.created_at,o.updated_at,
coalesce(i.total_amount,0)::numeric total_amount,coalesce(p.paid_amount,0)::numeric paid_amount,(coalesce(i.total_amount,0)-coalesce(p.paid_amount,0))::numeric balance_due,
case when o.status='CANCELLED' then 'CANCELLED' when coalesce(p.paid_amount,0)=0 then 'UNPAID' when coalesce(p.paid_amount,0)<coalesce(i.total_amount,0) then 'PARTIAL' when coalesce(p.paid_amount,0)=coalesce(i.total_amount,0) then 'PAID' else 'OVERPAID' end payment_status,
(o.status<>'CANCELLED' and o.due_date is not null and o.due_date<current_date and (coalesce(i.total_amount,0)-coalesce(p.paid_amount,0))>0) is_overdue
from public.procurement_purchase_orders o join public.procurement_suppliers s on s.id=o.supplier_id
left join lateral (select sum(x.line_total) total_amount from public.procurement_purchase_order_items x where x.purchase_order_id=o.id) i on true
left join lateral (select sum(a.amount) paid_amount from public.procurement_supplier_payment_allocations a join public.procurement_supplier_payments pay on pay.id=a.payment_id and pay.status='ACTIVE' where a.purchase_order_id=o.id) p on true;
grant select on public.v_procurement_order_summary to authenticated;

create or replace view public.v_procurement_report_lines with (security_invoker=true) as
select o.id purchase_order_id,o.order_no,o.order_date,o.due_date,o.status,s.id supplier_id,s.code supplier_code,s.name supplier_name,i.id item_id,i.product_id,i.package_id,i.product_code_snapshot product_code,i.product_name_snapshot product_name,p.category,i.base_unit_snapshot base_unit,i.purchase_unit_snapshot purchase_unit,i.quantity,i.base_qty_per_unit,i.base_quantity,i.unit_price,i.line_total
from public.procurement_purchase_orders o join public.procurement_suppliers s on s.id=o.supplier_id join public.procurement_purchase_order_items i on i.purchase_order_id=o.id join public.procurement_products p on p.id=i.product_id where o.status<>'CANCELLED';
grant select on public.v_procurement_report_lines to authenticated;

create or replace view public.v_procurement_supplier_payables with (security_invoker=true) as
select s.id supplier_id,s.code supplier_code,s.name supplier_name,
coalesce(sum(v.total_amount) filter(where v.status<>'CANCELLED'),0)::numeric total_purchases,
coalesce(sum(v.paid_amount) filter(where v.status<>'CANCELLED'),0)::numeric total_paid,
coalesce(sum(v.balance_due) filter(where v.status<>'CANCELLED'),0)::numeric balance_due,
min(v.due_date) filter(where v.status<>'CANCELLED' and v.balance_due>0) oldest_due_date,
coalesce(sum(v.balance_due) filter(where v.is_overdue),0)::numeric overdue_balance
from public.procurement_suppliers s left join public.v_procurement_order_summary v on v.supplier_id=s.id group by s.id,s.code,s.name;
grant select on public.v_procurement_supplier_payables to authenticated;

-- Atomic order create/edit with accounting-integrity guards.
create or replace function public.procurement_save_order(p_order jsonb,p_items jsonb,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
  v_id uuid; v_order_no text; v_supplier uuid; v_old_supplier uuid; v_order_date date; v_due date; v_expected_due date;
  v_terms integer:=0; v_old_paid numeric:=0; v_new_total numeric:=0; v_item jsonb; v_product uuid; v_package uuid;
  v_code text; v_name text; v_base_unit text; v_purchase_unit text; v_factor numeric; v_qty numeric; v_price numeric; v_count integer:=0;
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền nghiệp vụ mua hàng.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Đơn nhập phải có ít nhất 1 hàng hóa.'; end if;
  v_supplier:=nullif(p_order->>'supplier_id','')::uuid;
  v_order_date:=coalesce(nullif(p_order->>'order_date','')::date,current_date);
  v_due:=nullif(p_order->>'due_date','')::date;
  if v_supplier is null then raise exception 'Chưa chọn nhà cung cấp.'; end if;
  select payment_terms_days into v_terms from public.procurement_suppliers where id=v_supplier and status='ACTIVE';
  if v_terms is null then raise exception 'Nhà cung cấp không tồn tại hoặc đã ngưng sử dụng.'; end if;
  v_expected_due:=v_order_date+v_terms;
  if v_due is null or v_due=(v_expected_due-1) then v_due:=v_expected_due; end if;
  v_id:=nullif(p_order->>'id','')::uuid;
  if v_id is null then
    v_order_no:='NH'||to_char(v_order_date,'YYYYMMDD')||'-'||lpad(nextval('public.procurement_order_no_seq')::text,5,'0');
    insert into public.procurement_purchase_orders(order_no,order_date,supplier_id,invoice_no,due_date,status,notes,posted_at,created_by,updated_by)
    values(v_order_no,v_order_date,v_supplier,nullif(p_order->>'invoice_no',''),v_due,'POSTED',nullif(p_order->>'notes',''),now(),auth.uid(),auth.uid()) returning id into v_id;
  else
    select o.order_no,o.supplier_id,coalesce(v.paid_amount,0) into v_order_no,v_old_supplier,v_old_paid
    from public.procurement_purchase_orders o left join public.v_procurement_order_summary v on v.id=o.id
    where o.id=v_id and o.status<>'CANCELLED' for update of o;
    if v_order_no is null then raise exception 'Không tìm thấy đơn nhập có thể chỉnh sửa.'; end if;
    if v_old_paid>0 and v_supplier<>v_old_supplier then raise exception 'Đơn đã có thanh toán nên không thể đổi nhà cung cấp.'; end if;
    update public.procurement_purchase_orders set order_date=v_order_date,supplier_id=v_supplier,invoice_no=nullif(p_order->>'invoice_no',''),due_date=v_due,notes=nullif(p_order->>'notes',''),updated_by=auth.uid(),version=version+1 where id=v_id;
    delete from public.procurement_purchase_order_items where purchase_order_id=v_id;
    insert into public.procurement_audit_log(entity_type,entity_id,action,reason,actor_id) values('PURCHASE_ORDER',v_id,'EDIT_REASON',coalesce(nullif(btrim(p_reason),''),'Chỉnh sửa đơn nhập'),auth.uid());
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product:=nullif(v_item->>'product_id','')::uuid; v_package:=nullif(v_item->>'package_id','')::uuid; v_qty:=nullif(v_item->>'quantity','')::numeric; v_price:=nullif(v_item->>'unit_price','')::numeric;
    if v_product is null or v_qty is null or v_qty<=0 or v_price is null or v_price<0 then raise exception 'Dòng hàng hóa không hợp lệ.'; end if;
    select code,name,base_unit into v_code,v_name,v_base_unit from public.procurement_products where id=v_product and status='ACTIVE';
    if v_code is null then raise exception 'Hàng hóa không tồn tại hoặc đã ngưng sử dụng.'; end if;
    if v_package is not null then
      select purchase_unit,base_qty_per_unit into v_purchase_unit,v_factor from public.procurement_product_packages where id=v_package and product_id=v_product and status='ACTIVE';
      if v_purchase_unit is null then raise exception 'Quy cách mua không hợp lệ.'; end if;
    else
      v_purchase_unit:=coalesce(nullif(v_item->>'purchase_unit',''),v_base_unit); v_factor:=coalesce(nullif(v_item->>'base_qty_per_unit','')::numeric,1);
      if v_factor<=0 then raise exception 'Hệ số quy đổi phải lớn hơn 0.'; end if;
    end if;
    insert into public.procurement_purchase_order_items(purchase_order_id,product_id,package_id,product_code_snapshot,product_name_snapshot,base_unit_snapshot,purchase_unit_snapshot,quantity,base_qty_per_unit,unit_price,notes,created_by)
    values(v_id,v_product,v_package,v_code,v_name,v_base_unit,v_purchase_unit,v_qty,v_factor,v_price,nullif(v_item->>'notes',''),auth.uid());
    v_count:=v_count+1; v_new_total:=v_new_total+(v_qty*v_price);
  end loop;
  if v_old_paid>0 and v_new_total<v_old_paid then raise exception 'Tổng đơn sau chỉnh sửa (%) không được thấp hơn số tiền đã thanh toán (%).',v_new_total,v_old_paid; end if;
  return jsonb_build_object('id',v_id,'order_no',v_order_no,'item_count',v_count,'due_date',v_due,'total_amount',v_new_total);
end $$;
grant execute on function public.procurement_save_order(jsonb,jsonb,text) to authenticated;

create or replace function public.procurement_record_payment(p_order_id uuid,p_amount numeric,p_payment_date date default current_date,p_method text default 'BANK',p_reference text default null,p_note text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_supplier uuid; v_balance numeric; v_payment uuid;
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền ghi nhận thanh toán.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Số tiền thanh toán phải lớn hơn 0.'; end if;
  if p_method not in ('CASH','BANK','MOMO','OTHER') then raise exception 'Phương thức thanh toán không hợp lệ.'; end if;
  select supplier_id,balance_due into v_supplier,v_balance from public.v_procurement_order_summary where id=p_order_id and status<>'CANCELLED';
  if v_supplier is null then raise exception 'Không tìm thấy đơn nhập.'; end if;
  if p_amount>v_balance then raise exception 'Số tiền vượt công nợ còn lại.'; end if;
  insert into public.procurement_supplier_payments(supplier_id,payment_date,amount,method,reference,notes,created_by,updated_by)
  values(v_supplier,coalesce(p_payment_date,current_date),p_amount,p_method,nullif(p_reference,''),nullif(p_note,''),auth.uid(),auth.uid()) returning id into v_payment;
  insert into public.procurement_supplier_payment_allocations(payment_id,purchase_order_id,amount) values(v_payment,p_order_id,p_amount);
  return jsonb_build_object('payment_id',v_payment,'remaining_balance',v_balance-p_amount);
end $$;
grant execute on function public.procurement_record_payment(uuid,numeric,date,text,text,text) to authenticated;

create or replace function public.procurement_void_payment(p_payment_id uuid,p_reason text)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền hủy thanh toán.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Phải nhập lý do hủy thanh toán.'; end if;
  update public.procurement_supplier_payments set status='VOID',void_reason=p_reason,voided_at=now(),updated_by=auth.uid() where id=p_payment_id and status='ACTIVE';
  if not found then raise exception 'Không tìm thấy thanh toán đang hoạt động.'; end if;
end $$;
grant execute on function public.procurement_void_payment(uuid,text) to authenticated;

create or replace function public.procurement_cancel_order(p_order_id uuid,p_reason text)
returns void language plpgsql security invoker set search_path=public as $$
declare v_paid numeric;
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền hủy đơn.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Phải nhập lý do hủy đơn.'; end if;
  select paid_amount into v_paid from public.v_procurement_order_summary where id=p_order_id and status<>'CANCELLED';
  if v_paid is null then raise exception 'Không tìm thấy đơn nhập.'; end if;
  if v_paid>0 then raise exception 'Đơn đã có thanh toán. Hãy hủy thanh toán trước khi hủy đơn.'; end if;
  update public.procurement_purchase_orders set status='CANCELLED',cancel_reason=p_reason,cancelled_at=now(),updated_by=auth.uid(),version=version+1 where id=p_order_id;
  insert into public.procurement_audit_log(entity_type,entity_id,action,reason,actor_id) values('PURCHASE_ORDER',p_order_id,'CANCEL_REASON',p_reason,auth.uid());
end $$;
grant execute on function public.procurement_cancel_order(uuid,text) to authenticated;
