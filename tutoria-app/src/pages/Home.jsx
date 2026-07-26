
const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">
        TutorIA
      </h1>
      <h2 className="text-xl font-medium text-gray-600 mb-8">
        Plataforma institucional de conocimiento e inteligencia
      </h2>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl w-full shadow-sm">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-blue-800 uppercase bg-blue-100 rounded-full">
          Estado: Platform Foundation
        </div>
        <p className="text-gray-600 leading-relaxed">
          La base técnica de TutorIA ha sido desplegada exitosamente (Zero Legacy).
          Los módulos funcionales, la identidad institucional y los motores de IA 
          se incorporarán en fases posteriores del desarrollo (Sprint 0.6+).
        </p>
      </div>
    </div>
  );
};

export default Home;
