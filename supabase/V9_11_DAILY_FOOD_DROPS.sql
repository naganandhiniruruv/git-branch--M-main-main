-- Food Drops recur daily from 8 PM to midnight India Standard Time.
-- The browser schedules the next window for display; this trigger normalizes
-- persisted window values and claim_food_drop enforces the authoritative rule.

create or replace function public.set_food_drop_daily_window()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_local_now timestamp without time zone := now() at time zone 'Asia/Kolkata';
  v_local_open timestamp without time zone;
  v_local_close timestamp without time zone;
begin
  v_local_open := date_trunc('day', v_local_now) + interval '20 hours';
  if v_local_now >= v_local_open then
    new.starts_at := now();
  else
    new.starts_at := v_local_open at time zone 'Asia/Kolkata';
  end if;
  v_local_close := date_trunc('day', v_local_now) + interval '1 day';
  new.ends_at := v_local_close at time zone 'Asia/Kolkata';
  return new;
end;
$$;

drop trigger if exists food_drops_daily_window on public.food_drops;
create trigger food_drops_daily_window
before insert or update of starts_at, ends_at on public.food_drops
for each row execute function public.set_food_drop_daily_window();

create or replace function public.claim_food_drop(p_drop_id uuid, p_quantity int)
returns public.food_drop_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop public.food_drops;
  v_claim public.food_drop_claims;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;

  update public.food_drops
    set remaining_quantity = remaining_quantity - p_quantity, updated_at = now()
    where id = p_drop_id
      and status = 'active'
      and clock_timestamp() >= starts_at
      and (clock_timestamp() at time zone 'Asia/Kolkata')::time >= time '20:00'
      and remaining_quantity >= p_quantity
    returning * into v_drop;

  if v_drop.id is null then
    raise exception 'Food Drops are available daily from 8:00 PM to midnight IST, while stock lasts' using errcode = 'P0001';
  end if;

  insert into public.food_drop_claims (drop_id, customer_id, quantity, unit_price, total_price)
  values (p_drop_id, auth.uid(), p_quantity, v_drop.drop_price, v_drop.drop_price * p_quantity)
  returning * into v_claim;

  return v_claim;
end;
$$;

grant execute on function public.claim_food_drop(uuid, int) to authenticated;
