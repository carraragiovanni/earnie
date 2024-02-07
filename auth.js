const supabaseUrl = 'https://wjjenusuwyxispmuwspn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        window.location.href = '/index.html'; // Redirect if logged in
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { user, session, error } = await supabase.auth.signIn({
        email: email,
        password: password,
    });

    if (error) alert(error.message);
    else window.location.href = '/index.html'; // Redirect on successful login
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { user, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) alert(error.message);
    else alert('Signup successful. Please check your email for verification.');
});
