import { supabase } from '../supabaseClient.js';

export async function fetchConversations() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*');
    if (error) throw new Error(error.message);
    return data;
}

export async function upsertUser(user) {
    const { data, error } = await supabase
        .from('users')
        .upsert([{ id: user.id, email: user.email }]);
    if (error) throw new Error(error.message);
    return data;
}