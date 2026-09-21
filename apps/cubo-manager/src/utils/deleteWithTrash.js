// Utilidad para mover archivos/carpetas a la papelera
// item: { id, name, path, type }
import { moveToTrash } from '../components/Trash/TrashBin';

export function deleteWithTrash(item) {
  // Aquí puedes agregar lógica para eliminar físicamente si es necesario
  moveToTrash(item);
}
