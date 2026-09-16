-- Retire two misleading placeholder packages that conflict with *ĐỊNH GIÁ.
-- They have never been used by a purchase-order item, so historical transactions are unaffected.
update public.procurement_product_packages pp
set status='INACTIVE', updated_at=now()
where pp.status='ACTIVE'
  and pp.label='Bao 30kg'
  and pp.product_id in (
    select id from public.procurement_products where code in ('BB016','BB017')
  )
  and not exists (
    select 1 from public.procurement_purchase_order_items i where i.package_id=pp.id
  );
