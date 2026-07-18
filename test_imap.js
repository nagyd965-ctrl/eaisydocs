const tls = require('tls');

const HOST = 'imap.websupport.hu';
const PORT = 993;
const USER = 'inboundtest@thinkai.hu';
const PASS = 'Dani123!';

console.log(`Connecting to ${HOST}:${PORT}...`);
const socket = tls.connect(PORT, HOST, { rejectUnauthorized: false }, () => {
  console.log('Connected.');
});

let state = 0;

socket.on('data', (data) => {
  const msg = data.toString();
  console.log('SERVER:', msg.trim());
  
  if (state === 0 && msg.includes('OK')) {
    console.log('Sending LOGIN...');
    socket.write(`A1 LOGIN "${USER}" "${PASS}"\r\n`);
    state = 1;
  } else if (state === 1) {
    if (msg.includes('A1 OK')) {
      console.log('LOGIN SUCCESSFUL!');
      socket.write('A2 LOGOUT\r\n');
    } else {
      console.log('LOGIN FAILED!');
      socket.destroy();
    }
  }
});

socket.on('error', (err) => {
  console.error('Socket error:', err.message);
});

socket.on('end', () => {
  console.log('Connection closed.');
});

setTimeout(() => {
  console.log('Timeout.');
  socket.destroy();
}, 10000);
