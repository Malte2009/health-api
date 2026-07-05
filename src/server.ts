import app from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (error: Error) => {
    console.error('Server error:', error);
});
