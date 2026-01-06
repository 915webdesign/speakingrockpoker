// Socket.io service
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join a room
    socket.on('join:room', ({ room }) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });
    
    // Leave a room
    socket.on('leave:room', ({ room }) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
