const supabaseUrl = 'https://wjjenusuwyxispmuwspn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

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
            div.className = 'conversation';
            div.textContent = `Conversation ID: ${conversation.conversation_id}`; // Adjust according to your data structure
            container.appendChild(div);
        });
    }
}

document.addEventListener('DOMContentLoaded', fetchConversations);

document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'your-supabase-url';
    const supabaseAnonKey = 'your-supabase-anon-key';
    const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // User is logged in, stay on or redirect to the main page
            if (window.location.pathname !== '/index.html') {
                window.location.href = '/index.html';
            }
        } else {
            // User is not logged in, redirect to auth.html
            if (window.location.pathname !== '/auth.html') {
                window.location.href = '/auth.html';
            }
        }
    });
});
