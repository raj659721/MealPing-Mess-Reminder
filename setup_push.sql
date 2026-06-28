drop table if exists push_subscriptions;

create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  endpoint text unique not null,
  keys_auth text not null,
  keys_p256dh text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on push_subscriptions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own push subscriptions"
  on push_subscriptions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own push subscriptions"
  on push_subscriptions for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete
  using ( auth.uid() = user_id );
