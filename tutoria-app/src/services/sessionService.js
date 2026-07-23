// Constantes configurables
const TIMEOUT_MINUTES = 30; // Tiempo total antes de cerrar sesión
const WARNING_SECONDS = 15; // Cuántos segundos antes mostramos la advertencia

export const getTimeoutMilliseconds = () => TIMEOUT_MINUTES * 60 * 1000;
export const getWarningMilliseconds = () => WARNING_SECONDS * 1000;

export const setLastActivity = () => {
  localStorage.setItem('lastActivityTime', Date.now().toString());
};

export const getLastActivity = () => {
  const lastActivity = localStorage.getItem('lastActivityTime');
  return lastActivity ? parseInt(lastActivity, 10) : Date.now();
};

export const clearSessionData = () => {
  localStorage.removeItem('lastActivityTime');
  // Se pueden limpiar más datos locales aquí si es necesario
};
