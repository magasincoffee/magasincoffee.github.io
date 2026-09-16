-- MAGASIN Procurement UX/reference-price v3
-- Source: *ĐỊNH GIÁ.xlsx / sheet "ĐƠN GIÁ MUA HÀNG" and "BẢNG CHUYỂN ĐỔI".
-- This table is reference-only: actual purchase prices continue to live on purchase order items.

-- Canonical-unit alignment supported by the supplied *ĐỊNH GIÁ source.
-- Only zero-transaction products are touched. Count-only items remain `cái`
-- when the workbook does not provide a mass/volume conversion.
update public.procurement_products p set base_unit='g', updated_at=now()
where p.code='BB015' and p.base_unit<>'g'
  and not exists(select 1 from public.procurement_purchase_order_items i where i.product_id=p.id);
update public.procurement_products p set base_unit='g', updated_at=now()
where p.code='BB007' and p.base_unit<>'g'
  and not exists(select 1 from public.procurement_purchase_order_items i where i.product_id=p.id);
update public.procurement_products p set base_unit='g', updated_at=now()
where p.code='BB008' and p.base_unit<>'g'
  and not exists(select 1 from public.procurement_purchase_order_items i where i.product_id=p.id);

create table if not exists public.procurement_price_references (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.procurement_products(id) on delete cascade,
  source_name text not null default '*ĐỊNH GIÁ',
  source_sheet text not null default 'ĐƠN GIÁ MUA HÀNG',
  source_row integer,
  source_item_name text not null,
  source_unit text,
  source_quantity numeric check (source_quantity is null or source_quantity > 0),
  source_price numeric check (source_price is null or source_price >= 0),
  source_unit_price numeric check (source_unit_price is null or source_unit_price >= 0),
  canonical_base_quantity numeric check (canonical_base_quantity is null or canonical_base_quantity > 0),
  brand text,
  source_group text,
  source_note text,
  conversion_note text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, source_name)
);

create index if not exists idx_proc_price_refs_product
  on public.procurement_price_references(product_id)
  where status='ACTIVE';

alter table public.procurement_price_references enable row level security;

drop policy if exists procurement_price_refs_select on public.procurement_price_references;
create policy procurement_price_refs_select
  on public.procurement_price_references
  for select
  to authenticated
  using (public.procurement_can_access());

revoke all on public.procurement_price_references from anon;
revoke insert,update,delete on public.procurement_price_references from authenticated;
grant select on public.procurement_price_references to authenticated;

drop trigger if exists trg_proc_price_refs_updated on public.procurement_price_references;
create trigger trg_proc_price_refs_updated
before update on public.procurement_price_references
for each row execute function public.procurement_set_updated_at();

create unique index if not exists procurement_product_packages_one_default_uidx
  on public.procurement_product_packages(product_id)
  where status='ACTIVE' and is_default;

with src(product_code,source_row,source_item_name,source_unit,source_quantity,source_price,source_unit_price,canonical_base_quantity,brand,source_group,source_note,conversion_note) as (
  values
    ('NL024',35,'Bánh Flan','cái',1,2596.666667,2596.666666666667,1.0,null,null,null,null),
    ('BB016',53,'Bọc 1 Ly','g',1000,45000,45,1000.0,null,null,'1 cái = 6,7g. 1g = 34đ',null),
    ('BB017',54,'Bọc 2 ly','g',1000,45000,45,1000.0,null,null,null,null),
    ('BB015',52,'Bọc Đựng Đá','g',1000,40000,40,1000.0,null,null,null,'Nguồn đã là g; chuẩn tồn = g'),
    ('NL003',7,'Bột Choco','g',1000,200000,200,1000.0,'WonderFram','CREAMER / POWDER – BỘT PHA CHẾ',null,null),
    ('NL004',8,'Bột Matcha','g',500,360000,720,500.0,null,'CREAMER / POWDER – BỘT PHA CHẾ',null,null),
    ('NL005',108,'Bột Sữa','g',1000,88000,88,1000.0,null,'CREAMER / POWDER – BỘT PHA CHẾ',null,null),
    ('BTP001',3,'Cà phê','g',1000,200000,200,1000.0,null,null,'0,4g = 1ml',null),
    ('BTP002',4,'Cà phê Phin','g',1000,200000,200,1000.0,null,null,null,null),
    ('NL034',39,'Chanh','g',1000,25000,25,1000.0,null,null,null,null),
    ('NL019',40,'Đào Hộp','g',450,34000,75.55555555555556,450.0,null,null,null,null),
    ('NL017',86,'Đường Bắp','g',25000,500000,20,37500.0,'GLO FOOD','SWEETENER – CHẤT TẠO NGỌT',null,'BẢNG CHUYỂN ĐỔI: 1 g = 1,5 ml'),
    ('NL018',11,'Đường Cát','g',12000,220000,18.333333333333332,12000.0,null,'SWEETENER – CHẤT TẠO NGỌT',null,null),
    ('BB009',41,'Giấy 16oz','cái',1,766,766,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB010',42,'Giấy 22oz','cái',1,758,758,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('NL023',34,'Hạt Đác','g',750,55000,73.33333333333333,750.0,null,null,null,null),
    ('NL026',88,'Hạt Sen','g',1000,155000,155,1000.0,null,null,null,null),
    ('NL028',25,'Hồng Trà','g',500,89000,178,500.0,'Hồng Trà',null,null,null),
    ('BB008',57,'Hút D12','cái',5000,195000,39,11904.7619047619,null,null,'100g = 42 cái','Quy về g: 5.000 cái × 100/42 = 11.904,762 g'),
    ('BB007',56,'Hút D6','g',5000,195000,39,5000.0,null,null,'100g = 122 cái','Nguồn đã là g; ghi chú 100 g = 122 cái dùng khi đối chiếu số cây'),
    ('NL027',24,'Lục Trà','g',500,42000,84,500.0,'Lục Trà',null,null,null),
    ('BB014',132,'Ly 1 Lít','cái',1,864,864,1.0,null,null,null,null),
    ('BB018',55,'Muỗng 20cm','cái',2500,390000,156,2500.0,null,'PACKAGING – BAO BÌ',null,null),
    ('NL015',115,'Mứt C.Dây','g',1250,72000,57.6,1250.0,'Mứt C.Dây',null,'1ml = 1,42g',null),
    ('NL014',113,'Mứt Đào','g',1250,65000,52,1250.0,null,null,null,null),
    ('NL013',20,'Mứt Dâu','g',1160,67000,57.758620689655174,1160.0,null,null,null,null),
    ('NL016',23,'Mứt Thơm','g',1,54,54,1.0,null,null,null,null),
    ('BB005',133,'Nắp 1 Lít','cái',1,232,232,1.0,null,null,null,null),
    ('BB006',91,'Nắp Bằng 90','cái',1,185,185,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB003',49,'Nắp SIP 98','cái',1,266,266,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB011',43,'PET 16oz','cái',1,662,662,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB012',44,'PET 20oz','cái',1,740,740,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB013',45,'PET 24oz','cái',1,630,630,1.0,null,'PACKAGING – BAO BÌ',null,null),
    ('BB001',9,'Phiếu','cái',1,50,50,1.0,null,null,null,null),
    ('BB002',60,'Phiếu 1 Lít','cái',1,50,50,1.0,null,null,null,null),
    ('NL010',16,'Sirup Bí Đao','ml',2500,128000,51.2,2500.0,'WONDERFUL','SIRUP','1ml = 1,48g',null),
    ('NL008',14,'Sirup Đào','ml',700,56000,80,700.0,'Sirup Đào','SIRUP','1ml = 1,43g',null),
    ('NL011',17,'Sirup Đường Đen','g',2000,138000,69,1315.7894736842104,null,'SIRUP','1ml = 1,52g','1 ml = 1,52 g'),
    ('NL006',12,'Sirup Hazelnut','ml',520,48000,92.3076923076923,520.0,null,'SIRUP',null,null),
    ('NL009',15,'Sirup Thơm','ml',700,56000,80,700.0,'Sirup Thơm','SIRUP','1ml = 1,43g',null),
    ('NL007',13,'Sirup Vanilla','ml',700,56000,80,700.0,null,'SIRUP','1ml = 1,43g',null),
    ('NL001',5,'Sữa Đặc','g',15000,705000,47,12000.0,null,null,'1ml = 1,25g','1 ml = 1,25 g'),
    ('NL002',6,'Sữa Tươi','ml',11580,375000,32.38341968911917,11580.0,null,null,null,null),
    ('NL021',32,'Thạch Đông Sương','g',1,7.211111111,7.21111111111111,1.0,null,null,null,null),
    ('NL020',30,'Thạch N.Trai','g',1400,39334,28.095714285714287,1400.0,'Thạch N.Trai',null,null,null),
    ('NL022',33,'Thạch Sương Sáo','g',1,8.336666667,8.336666666666668,1.0,null,null,null,null),
    ('NL030',93,'Trà olong quế hoa','g',1000,280000,280,1000.0,null,null,null,null),
    ('NL029',26,'Trà Olong Thanh Xuân','g',1000,250000,250,1000.0,'TẰNG VĨNH AN',null,'Trà Olong Thanh Xuân',null),
    ('NL032',28,'Trà Thái Đỏ','g',400,65000,162.5,400.0,null,null,null,null),
    ('NL031',27,'Trà Thái Xanh','g',200,58000,290,200.0,null,null,null,null),
    ('NL033',38,'Trân Châu Đen','g',1000,21000,21,1000.0,'Trân châu MH',null,null,null)
)
insert into public.procurement_price_references(product_id,source_name,source_sheet,source_row,source_item_name,source_unit,source_quantity,source_price,source_unit_price,canonical_base_quantity,brand,source_group,source_note,conversion_note,status)
select p.id,'*ĐỊNH GIÁ','ĐƠN GIÁ MUA HÀNG',s.source_row,s.source_item_name,s.source_unit,s.source_quantity,s.source_price,s.source_unit_price,s.canonical_base_quantity,s.brand,s.source_group,s.source_note,s.conversion_note,'ACTIVE'
from src s join public.procurement_products p on p.code=s.product_code
on conflict(product_id,source_name) do update set source_sheet=excluded.source_sheet,source_row=excluded.source_row,source_item_name=excluded.source_item_name,source_unit=excluded.source_unit,source_quantity=excluded.source_quantity,source_price=excluded.source_price,source_unit_price=excluded.source_unit_price,canonical_base_quantity=excluded.canonical_base_quantity,brand=excluded.brand,source_group=excluded.source_group,source_note=excluded.source_note,conversion_note=excluded.conversion_note,status='ACTIVE',updated_at=now();

create or replace view public.v_procurement_product_price_context with (security_invoker=true) as
select p.id product_id,p.code product_code,p.name product_name,p.base_unit,r.id reference_id,r.source_name,r.source_sheet,r.source_row,r.source_item_name,r.source_unit,r.source_quantity,r.source_price,r.source_unit_price,r.canonical_base_quantity reference_base_quantity,case when r.canonical_base_quantity>0 then r.source_price/r.canonical_base_quantity end reference_price_per_base_unit,r.brand,r.source_group,r.source_note,r.conversion_note,lp.order_date last_order_date,lp.purchase_unit last_purchase_unit,lp.base_qty_per_unit last_base_qty_per_unit,lp.unit_price last_unit_price,lp.line_total last_line_total
from public.procurement_products p
left join public.procurement_price_references r on r.product_id=p.id and r.status='ACTIVE'
left join lateral (
  select o.order_date,i.purchase_unit_snapshot purchase_unit,i.base_qty_per_unit,i.unit_price,i.line_total
  from public.procurement_purchase_order_items i join public.procurement_purchase_orders o on o.id=i.purchase_order_id
  where i.product_id=p.id and o.status<>'CANCELLED'
  order by o.order_date desc,i.created_at desc,i.id desc limit 1
) lp on true;
revoke all on public.v_procurement_product_price_context from anon;
revoke all on public.v_procurement_product_price_context from public;
grant select on public.v_procurement_product_price_context to authenticated;
