async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/services');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Services Count:', json.length);
    console.log('First Service:', json[0]);
  } catch (err) {
    console.error('Error connecting to server:', err.message);
  }
}

test();
