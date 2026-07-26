import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="h-16 border-b border-gray-200 flex items-center px-6">
        <div className="text-lg font-bold text-gray-800 tracking-wide">
          TutorIA Platform
        </div>
      </header>
      <main className="flex-1 bg-white">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        &copy; {new Date().getFullYear()} TutorIA. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default MainLayout;
