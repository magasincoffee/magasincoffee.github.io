-- MAGASIN Procurement payment mode + cancelled balance v4
-- Applied to production as migration 20260916154935.
-- 1) Cancelled orders must never contribute to receivables/payables balance.
-- 2) New purchase orders can be saved atomically as DEBT or IMMEDIATE payment.

create or replace view public.v_procurement_order_summary
with (security_invoker = true)
as
select
  o.id,
  o.order_no,
  o.order_date,
  o.supplier_id,
  s.code as supplier_code,
  s.name as supplier_name,
  o.invoice_no,
  o.receiving_location,
  o.due_date,
  o.status,
  o.notes,
  o.version,
  o.created_at,
  o.updated_at,
  coalesce(i.total_amount,0)::numeric as total_amount,
  coalesce(p.paid_amount,0)::numeric as paid_amount,
  case
    when o.status = 'CANCELLED' then 0::numeric
    else (coalesce(i.total_amount,0) - coalesce(p.paid_amount,0))::numeric
  end as balance_due,
  case
    when o.status = 'CANCELLED' then 'CANCELLED'
    when coalesce(p.paid_amount,0)=0 then 'UNPAID'
    when coalesce(p.paid_amount,0)<coalesce(i.total_amount,0) then 'PARTIAL'
    when coalesce(p.paid_amount,0)=coalesce(i.total_amount,0) then 'PAID'
    else 'OVERPAID'
  end as payment_status,
  (
    o.status <> 'CANCELLED'
    and o.due_date is not null
    and o.due_date < current_date
    and (coalesce(i.total_amount,0)-coalesce(p.paid_amount,0)) > 0
  ) as is_overdue
from public.procurement_purchase_orders o
join public.procurement_suppliers s on s.id=o.supplier_id
left join lateral (
  select sum(x.line_total) as total_amount
  from public.procurement_purchase_order_items x
  where x.purchase_order_id=o.id
) i on true
left join lateral (
  select sum(a.amount) as paid_amount
  from public.procurement_supplier_payment_allocations a
  join public.procurement_supplier_payments pay
    on pay.id=a.payment_id and pay.status='ACTIVE'
  where a.purchase_order_id=o.id
) p on true;

grant select on public.v_procurement_order_summary to authenticated;

create or replace function public.procurement_save_order_with_payment(
  p_order jsonb,
  p_items jsonb,
  p_reason text default null,
  p_payment jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
  v_payment_result jsonb;
  v_mode text := upper(coalesce(nullif(btrim(p_payment->>'mode'),''),'DEBT'));
  v_method text := upper(coalesce(nullif(btrim(p_payment->>'method'),''),'BANK'));
  v_payment_date date;
  v_total numeric;
  v_order_id uuid;
begin
  if not public.procurement_can_access() then
    raise exception 'Không có quyền nghiệp vụ mua hàng.';
  end if;

  if v_mode not in ('DEBT','IMMEDIATE') then
    raise exception 'Hình thức thanh toán không hợp lệ.';
  end if;

  if v_mode = 'IMMEDIATE' and nullif(coalesce(p_order->>'id',''),'') is not null then
    raise exception 'Thanh toán ngay chỉ áp dụng khi tạo đơn mới. Đơn đã có dùng chức năng Thanh toán.';
  end if;

  v_result := public.procurement_save_order(p_order,p_items,p_reason);

  if v_mode = 'IMMEDIATE' then
    v_total := coalesce((v_result->>'total_amount')::numeric,0);
    if v_total <= 0 then
      raise exception 'Tổng đơn phải lớn hơn 0 để ghi nhận thanh toán ngay.';
    end if;

    v_order_id := (v_result->>'id')::uuid;
    v_payment_date := coalesce(
      nullif(p_payment->>'payment_date','')::date,
      nullif(p_order->>'order_date','')::date,
      current_date
    );

    v_payment_result := public.procurement_record_payment(
      v_order_id,
      v_total,
      v_payment_date,
      v_method,
      nullif(btrim(coalesce(p_payment->>'reference','')),''),
      nullif(btrim(coalesce(p_payment->>'note','')),'')
    );

    v_result := v_result || jsonb_build_object(
      'payment_mode','IMMEDIATE',
      'payment',v_payment_result
    );
  else
    v_result := v_result || jsonb_build_object('payment_mode','DEBT');
  end if;

  return v_result;
end;
$$;

revoke execute on function public.procurement_save_order_with_payment(jsonb,jsonb,text,jsonb) from public, anon;
grant execute on function public.procurement_save_order_with_payment(jsonb,jsonb,text,jsonb) to authenticated;
