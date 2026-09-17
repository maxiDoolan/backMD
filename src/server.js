import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  connectDB()
    .then(() => console.log('Conectado a MongoDB'))
    .catch((error) => console.error('Error conectando a MongoDB:', error));
});
