fetch('http://127.0.0.1:4000/api/auth/callback/credentials-signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'email=test22@test.com&password=password123'
}).then(async res => {
  console.log('Status:', res.status);
  console.log('Headers:', res.headers);
  console.log('Body:', await res.text());
}).catch(e => console.error('Fetch error:', e));
