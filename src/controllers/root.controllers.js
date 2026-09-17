export async function healtstatus(req, res, next) {
  try {
    res.status(200).json({ status: 'ok', message: 'Servidor activo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
