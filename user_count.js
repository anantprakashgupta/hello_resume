const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');

let connectedUsers = new Set();
io.on('connection', (socket) => {
  // Add the connected user to the set
  connectedUsers.add(socket.id);
  io.emit('userCount', connectedUsers.size);

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove the disconnected user from the set
    connectedUsers.delete(socket.id);

    // Emit the updated count of connected users to all clients
    io.emit('userCount', connectedUsers.size);
  });
});

app.get('/', (req, res) => {
  res.render('index');
}); 

app.get('/user_count', (req, res) => {
  res.json({ userCount: connectedUsers.size });
});

http.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});

// const server = http.listen(5000, () => {
//   console.log('Server is running on http://localhost:5000');
// });

// app.listen(server, () => {
//   console.log('Application is running on http://localhost:5000');
// });