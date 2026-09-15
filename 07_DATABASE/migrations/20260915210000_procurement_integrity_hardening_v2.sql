-- MAGASIN Procurement integrity hardening v2
-- Goals:
-- 1) serialize supplier payments per purchase order
-- 2) block duplicate supplier invoice numbers
-- 3) preserve a complete order revision snapshot on edits
-- 4) prevent clients bypassing purchase-order/payment RPCs
-- 5) allow a previously inactivated package label to be created again
-- 6) remove public EXECUTE from internal trigger/helper functions

-- ---------------------------------------------------------------------------
-- Safer updated_at trigger function.
-- ---------------------------------------------------------------------------
create or replace function public.procurement_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Purchase package labels: unique only while ACTIVE.
-- Historical inactive package records remain immutable references for old orders.
-- ---------------------------------------------------------------------------
alter table public.procurement_product_packages
  drop constraint if exists procurement_product_packages_product_id_label_key;

drop index if exists public.procurement_product_packages_active_label_uidx;
create unique index procurement_product_packages_active_label_uidx
  on public.procurement_product_packages(product_id, lower(btrim(label)))
  where status = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- Supplier invoice duplicate protection.
-- ---------------------------------------------------------------------------
drop index if exists public.procurement_purchase_orders_supplier_invoice_uidx;
create unique index procurement_purchase_orders_supplier_invoice_uidx
  on public.procurement_purchase_orders(supplier_id, lower(btrim(invoice_no)))
  where invoice_no is not null
    and btrim(invoice_no) <> ''
    and status <> 'CANCELLED';

-- ---------------------------------------------------------------------------
-- Atomic order create/edit. SECURITY DEFINER is intentional: authenticated
-- clients may only mutate accounting-order tables through this guarded RPC.
-- ---------------------------------------------------------------------------
create or replace function public.procurement_save_order(
  p_order jsonb,
  p_items jsonb,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_no text;
  v_supplier uuid;
  v_old_supplier uuid;
  v_order_date date;
  v_due date;
  v_expected_due date;
  v_terms integer := 0;
  v_old_paid numeric := 0;
  v_new_total numeric := 0;
  v_item jsonb;
  v_product uuid;
  v_package uuid;
  v_code text;
  v_name text;
  v_base_unit text;
  v_purchase_unit text;
  v_factor numeric;
  v_qty numeric;
  v_price numeric;
  v_count integer := 0;
  v_invoice text;
  v_before_items jsonb := '[]'::jsonb;
  v_after_items jsonb := '[]'::jsonb;
  v_is_edit boolean := false;
begin
  if not public.procurement_can_access() then
    raise exception 'Không có quyền nghiệp vụ mua hàng.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn nhập phải có ít nhất 1 hàng hóa.';
  end if;

  v_supplier := nullif(p_order->>'supplier_id','')::uuid;
  v_order_date := coalesce(nullif(p_order->>'order_date','')::date, current_date);
  v_due := nullif(p_order->>'due_date','')::date;
  v_invoice := nullif(btrim(coalesce(p_order->>'invoice_no','')), '');
  v_id := nullif(p_order->>'id','')::uuid;

  if v_supplier is null then raise exception 'Chưa chọn nhà cung cấp.'; end if;

  select payment_terms_days
    into v_terms
  from public.procurement_suppliers
  where id = v_supplier and status = 'ACTIVE';
  if v_terms is null then
    raise exception 'Nhà cung cấp không tồn tại hoặc đã ngưng sử dụng.';
  end if;

  v_expected_due := v_order_date + v_terms;
  -- Compatibility guard for the old browser date calculation. Can be removed
  -- after all clients use pure calendar-date arithmetic.
  if v_due is null or v_due = (v_expected_due - 1) then
    v_due := v_expected_due;
  end if;

  if v_invoice is not null and exists (
    select 1
    from public.procurement_purchase_orders x
    where x.supplier_id = v_supplier
      and x.status <> 'CANCELLED'
      and lower(btrim(x.invoice_no)) = lower(v_invoice)
      and (v_id is null or x.id <> v_id)
  ) then
    raise exception 'Số hóa đơn/chứng từ % đã tồn tại cho nhà cung cấp này.', v_invoice;
  end if;

  if v_id is null then
    v_order_no := 'NH' || to_char(v_order_date,'YYYYMMDD') || '-' || lpad(nextval('public.procurement_order_no_seq')::text,5,'0');
    insert into public.procurement_purchase_orders(
      order_no,order_date,supplier_id,invoice_no,due_date,status,notes,
      posted_at,created_by,updated_by
    ) values (
      v_order_no,v_order_date,v_supplier,v_invoice,v_due,'POSTED',
      nullif(p_order->>'notes',''),now(),auth.uid(),auth.uid()
    ) returning id into v_id;
  else
    v_is_edit := true;
    select o.order_no,o.supplier_id,coalesce(v.paid_amount,0)
      into v_order_no,v_old_supplier,v_old_paid
    from public.procurement_purchase_orders o
    left join public.v_procurement_order_summary v on v.id=o.id
    where o.id=v_id and o.status<>'CANCELLED'
    for update of o;

    if v_order_no is null then
      raise exception 'Không tìm thấy đơn nhập có thể chỉnh sửa.';
    end if;
    if nullif(btrim(coalesce(p_reason,'')),'') is null then
      raise exception 'Khi chỉnh sửa đơn, phải nhập lý do chỉnh sửa.';
    end if;
    if v_old_paid > 0 and v_supplier <> v_old_supplier then
      raise exception 'Đơn đã có thanh toán nên không thể đổi nhà cung cấp.';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id',i.product_id,
      'product_code',i.product_code_snapshot,
      'product_name',i.product_name_snapshot,
      'package_id',i.package_id,
      'purchase_unit',i.purchase_unit_snapshot,
      'base_unit',i.base_unit_snapshot,
      'quantity',i.quantity,
      'base_qty_per_unit',i.base_qty_per_unit,
      'base_quantity',i.base_quantity,
      'unit_price',i.unit_price,
      'line_total',i.line_total
    ) order by i.created_at,i.id),'[]'::jsonb)
      into v_before_items
    from public.procurement_purchase_order_items i
    where i.purchase_order_id=v_id;

    update public.procurement_purchase_orders
    set order_date=v_order_date,
        supplier_id=v_supplier,
        invoice_no=v_invoice,
        due_date=v_due,
        notes=nullif(p_order->>'notes',''),
        updated_by=auth.uid(),
        version=version+1
    where id=v_id;

    delete from public.procurement_purchase_order_items
    where purchase_order_id=v_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product := nullif(v_item->>'product_id','')::uuid;
    v_package := nullif(v_item->>'package_id','')::uuid;
    v_qty := nullif(v_item->>'quantity','')::numeric;
    v_price := nullif(v_item->>'unit_price','')::numeric;

    if v_product is null or v_qty is null or v_qty<=0 or v_price is null or v_price<0 then
      raise exception 'Dòng hàng hóa không hợp lệ.';
    end if;

    select code,name,base_unit
      into v_code,v_name,v_base_unit
    from public.procurement_products
    where id=v_product and status='ACTIVE';
    if v_code is null then
      raise exception 'Hàng hóa không tồn tại hoặc đã ngưng sử dụng.';
    end if;

    if v_package is not null then
      select purchase_unit,base_qty_per_unit
        into v_purchase_unit,v_factor
      from public.procurement_product_packages
      where id=v_package and product_id=v_product and status='ACTIVE';
      if v_purchase_unit is null then
        raise exception 'Quy cách mua không hợp lệ.';
      end if;
    else
      v_purchase_unit := coalesce(nullif(v_item->>'purchase_unit',''),v_base_unit);
      v_factor := coalesce(nullif(v_item->>'base_qty_per_unit','')::numeric,1);
      if v_factor<=0 then raise exception 'Hệ số quy đổi phải lớn hơn 0.'; end if;
    end if;

    insert into public.procurement_purchase_order_items(
      purchase_order_id,product_id,package_id,product_code_snapshot,
      product_name_snapshot,base_unit_snapshot,purchase_unit_snapshot,
      quantity,base_qty_per_unit,unit_price,notes,created_by
    ) values (
      v_id,v_product,v_package,v_code,v_name,v_base_unit,v_purchase_unit,
      v_qty,v_factor,v_price,nullif(v_item->>'notes',''),auth.uid()
    );

    v_count := v_count + 1;
    v_new_total := v_new_total + (v_qty*v_price);
  end loop;

  if v_old_paid>0 and v_new_total<v_old_paid then
    raise exception 'Tổng đơn sau chỉnh sửa (%) không được thấp hơn số tiền đã thanh toán (%).',v_new_total,v_old_paid;
  end if;

  if v_is_edit then
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id',i.product_id,
      'product_code',i.product_code_snapshot,
      'product_name',i.product_name_snapshot,
      'package_id',i.package_id,
      'purchase_unit',i.purchase_unit_snapshot,
      'base_unit',i.base_unit_snapshot,
      'quantity',i.quantity,
      'base_qty_per_unit',i.base_qty_per_unit,
      'base_quantity',i.base_quantity,
      'unit_price',i.unit_price,
      'line_total',i.line_total
    ) order by i.created_at,i.id),'[]'::jsonb)
      into v_after_items
    from public.procurement_purchase_order_items i
    where i.purchase_order_id=v_id;

    insert into public.procurement_audit_log(
      entity_type,entity_id,action,before_data,after_data,reason,actor_id
    ) values (
      'PURCHASE_ORDER',v_id,'ORDER_REVISION',
      jsonb_build_object('items',v_before_items),
      jsonb_build_object('items',v_after_items),
      btrim(p_reason),auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id',v_id,'order_no',v_order_no,'item_count',v_count,
    'due_date',v_due,'total_amount',v_new_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment RPC: lock the order first so two simultaneous payments cannot both
-- observe the same remaining balance.
-- ---------------------------------------------------------------------------
create or replace function public.procurement_record_payment(
  p_order_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_method text default 'BANK',
  p_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier uuid;
  v_balance numeric;
  v_payment uuid;
begin
  if not public.procurement_can_access() then
    raise exception 'Không có quyền ghi nhận thanh toán.';
  end if;
  if p_amount is null or p_amount<=0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0.';
  end if;
  if p_method not in ('CASH','BANK','MOMO','OTHER') then
    raise exception 'Phương thức thanh toán không hợp lệ.';
  end if;

  select supplier_id into v_supplier
  from public.procurement_purchase_orders
  where id=p_order_id and status<>'CANCELLED'
  for update;
  if v_supplier is null then raise exception 'Không tìm thấy đơn nhập.'; end if;

  select balance_due into v_balance
  from public.v_procurement_order_summary
  where id=p_order_id and status<>'CANCELLED';

  if v_balance is null or v_balance<=0 then
    raise exception 'Đơn nhập không còn công nợ.';
  end if;
  if p_amount>v_balance then
    raise exception 'Số tiền vượt công nợ còn lại.';
  end if;

  insert into public.procurement_supplier_payments(
    supplier_id,payment_date,amount,method,reference,notes,created_by,updated_by
  ) values (
    v_supplier,coalesce(p_payment_date,current_date),p_amount,p_method,
    nullif(btrim(coalesce(p_reference,'')),''),nullif(btrim(coalesce(p_note,'')),''),
    auth.uid(),auth.uid()
  ) returning id into v_payment;

  insert into public.procurement_supplier_payment_allocations(payment_id,purchase_order_id,amount)
  values(v_payment,p_order_id,p_amount);

  return jsonb_build_object('payment_id',v_payment,'remaining_balance',v_balance-p_amount);
end;
$$;

create or replace function public.procurement_void_payment(p_payment_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền hủy thanh toán.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Phải nhập lý do hủy thanh toán.'; end if;
  update public.procurement_supplier_payments
  set status='VOID',void_reason=btrim(p_reason),voided_at=now(),updated_by=auth.uid()
  where id=p_payment_id and status='ACTIVE';
  if not found then raise exception 'Không tìm thấy thanh toán đang hoạt động.'; end if;
end;
$$;

create or replace function public.procurement_cancel_order(p_order_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_paid numeric;
begin
  if not public.procurement_can_access() then raise exception 'Không có quyền hủy đơn.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Phải nhập lý do hủy đơn.'; end if;

  perform 1 from public.procurement_purchase_orders
  where id=p_order_id and status<>'CANCELLED'
  for update;
  if not found then raise exception 'Không tìm thấy đơn nhập.'; end if;

  select paid_amount into v_paid
  from public.v_procurement_order_summary
  where id=p_order_id and status<>'CANCELLED';
  if coalesce(v_paid,0)>0 then
    raise exception 'Đơn đã có thanh toán. Hãy hủy thanh toán trước khi hủy đơn.';
  end if;

  update public.procurement_purchase_orders
  set status='CANCELLED',cancel_reason=btrim(p_reason),cancelled_at=now(),updated_by=auth.uid(),version=version+1
  where id=p_order_id;

  insert into public.procurement_audit_log(entity_type,entity_id,action,reason,actor_id)
  values('PURCHASE_ORDER',p_order_id,'CANCEL_REASON',btrim(p_reason),auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API surface: only authenticated users may invoke business RPCs.
-- Internal trigger/helper functions are not callable through PostgREST.
-- ---------------------------------------------------------------------------
revoke execute on function public.procurement_save_order(jsonb,jsonb,text) from public, anon;
revoke execute on function public.procurement_record_payment(uuid,numeric,date,text,text,text) from public, anon;
revoke execute on function public.procurement_void_payment(uuid,text) from public, anon;
revoke execute on function public.procurement_cancel_order(uuid,text) from public, anon;
grant execute on function public.procurement_save_order(jsonb,jsonb,text) to authenticated;
grant execute on function public.procurement_record_payment(uuid,numeric,date,text,text,text) to authenticated;
grant execute on function public.procurement_void_payment(uuid,text) to authenticated;
grant execute on function public.procurement_cancel_order(uuid,text) to authenticated;

revoke execute on function public.procurement_assign_product_code() from public, anon, authenticated;
revoke execute on function public.procurement_assign_supplier_code() from public, anon, authenticated;
revoke execute on function public.procurement_audit_row() from public, anon, authenticated;
revoke execute on function public.procurement_install_triggers() from public, anon, authenticated;
revoke execute on function public.procurement_protect_product_base_unit() from public, anon, authenticated;
revoke execute on function public.procurement_set_updated_at() from public, anon, authenticated;

revoke execute on function public.procurement_can_access() from public, anon;
grant execute on function public.procurement_can_access() to authenticated;

-- Clients can read accounting tables, but accounting writes must go through RPCs.
revoke insert,update,delete on public.procurement_purchase_orders from authenticated;
revoke insert,update,delete on public.procurement_purchase_order_items from authenticated;
revoke insert,update,delete on public.procurement_supplier_payments from authenticated;
revoke insert,update,delete on public.procurement_supplier_payment_allocations from authenticated;
grant select on public.procurement_purchase_orders,
                public.procurement_purchase_order_items,
                public.procurement_supplier_payments,
                public.procurement_supplier_payment_allocations
  to authenticated;
