export default function AccesoDenegado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-3">Acceso no autorizado</h1>
        <p className="text-gray-400">
          Esta cuenta de Google no tiene permiso para administrar esta aplicación.
          Si crees que esto es un error, contacta al dueño del sitio.
        </p>
      </div>
    </div>
  );
}
