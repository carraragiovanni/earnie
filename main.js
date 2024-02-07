document.addEventListener('DOMContentLoaded', async () => {
    const supabaseUrl = 'https://wjjenusuwyxispmuwspn.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs';
   const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = '/auth.html';
    } else {
        fetchConversations();
    }
});

async function fetchConversations() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*');

    if (error) {
        console.error('Error fetching conversations:', error);
    } else {
        const container = document.getElementById('conversations-container');
        data.forEach(conversation => {
            const div = document.createElement('div');
            div.textContent = `Conversation ID: ${conversation.conversation_id}`;
