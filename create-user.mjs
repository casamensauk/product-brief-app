async function main() {
  const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL + '/sign-up/email';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    },
    body: JSON.stringify({
      email: "simmakin@gmail.com",
      password: process.env.ADMIN_PASSWORD,
      name: "Simon Makin",
      callbackURL: "http://localhost:3000/dashboard"
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    console.error("Error signing up:", error);
  } else {
    const data = await res.json();
    console.log("Success:", data);
  }
}

main();
