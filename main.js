// const supabase = window.supabase.createClient('https://wjjenusuwyxispmuwspn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs');

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize your Supabase client
    const supabase = window.supabase.createClient(
        'https://wjjenusuwyxispmuwspn.supabase.co', 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs'
    );

    // Get current user's details
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect if no user is logged in
    if (error || !user) {
        console.error('No user logged in or error fetching user:', error);
        window.location.href = '/auth.html';
        return;
    }

    // Add event listener for form submission
    document.getElementById('new-conversation-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneNumber = document.getElementById('phone-number').value.trim();
        const messageBody = document.getElementById('message-body').value.trim();

        // Assuming you have a 'conversations' table where each phone number corresponds to a unique conversation
        // And a 'messages' table for storing individual messages linked to those conversations
        // Adjust the logic below based on your actual database schema

        // Step 1: Insert a new conversation or find an existing one by phone number
        // This example simplifies by always creating a new conversation for each message
        const { data: conversationData, error: conversationError } = await supabase
            .from('conversations')
            .insert([{ phone_number: phoneNumber, user_id: user.id }]);

        if (conversationError) {
            console.error('Error creating conversation:', conversationError);
            alert('Failed to create conversation.');
            return;
        }

        const conversationId = conversationData[0].id;

        // Step 2: Insert the message linked to the conversation
        const { error: messageError } = await supabase
            .from('messages')
            .insert([{ body: messageBody, conversation_id: conversationId }]);

        if (messageError) {
            console.error('Error inserting message:', messageError);
            alert('Failed to send message.');
            return;
        }

        alert('Message sent successfully!');
        // Here you would typically also include the logic to update the UI with the new message
        // And potentially a server-side call to Telnyx to actually send the message, which is not shown here
    });
});
