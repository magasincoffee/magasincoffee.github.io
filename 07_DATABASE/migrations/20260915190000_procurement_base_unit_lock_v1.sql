-- MAGASIN Procurement: lock base unit after first purchase transaction.
-- Applied to production as: protect_procurement_base_unit_after_transactions

create or replace function public.procurement_protect_product_base_unit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.base_unit is distinct from old.base_unit
     and exists (
       select 1
       from public.procurement_purchase_order_items poi
       where poi.product_id = old.id
       limit 1
     ) then
    raise exception 'Đơn vị chuẩn đã bị khóa vì hàng hóa đã phát sinh đơn nhập. Hãy giữ nguyên đơn vị chuẩn và chỉ chỉnh quy cách mua.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists procurement_products_protect_base_unit on public.procurement_products;
create trigger procurement_products_protect_base_unit
before update of base_unit on public.procurement_products
for each row
execute function public.procurement_protect_product_base_unit();
