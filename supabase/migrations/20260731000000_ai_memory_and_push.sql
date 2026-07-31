create table if not exists public.ai_conversations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_conversations enable row level security;

create policy "Users can view their own AI conversations" 
    on public.ai_conversations for select 
    using (auth.uid() = user_id);

create policy "Users can insert their own AI conversations" 
    on public.ai_conversations for insert 
    with check (auth.uid() = user_id);

-- Admins can view all conversations
create policy "Admins can view all AI conversations" 
    on public.ai_conversations for select 
    using (
        exists (
            select 1 from public.user_roles 
            where user_roles.user_id = auth.uid() 
            and user_roles.role = 'admin'
        )
    );

create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions" 
    on public.push_subscriptions for select 
    using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions" 
    on public.push_subscriptions for insert 
    with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions" 
    on public.push_subscriptions for delete 
    using (auth.uid() = user_id);

-- Admins or edge functions will need to read them, but since we run server-side functions using the Service Role Key, RLS is bypassed.
