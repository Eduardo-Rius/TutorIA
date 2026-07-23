const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_GENERAR_PLANEACION;

/**
 * Envía el contexto de la planeación a n8n para obtener sugerencias pedagógicas con IA.
 * @param {Object} formData - Los datos del formulario de la planeación.
 * @param {Object} profile - Perfil del usuario (docente).
 * @returns {Promise<Object>} - Las sugerencias generadas.
 */
export const generarSugerenciasPlaneacion = async (formData, profile) => {
  console.log("Usando webhook:", N8N_WEBHOOK_URL);
  const payload = {
    tipo: "planeacion",
    contexto: {
      codigoGuarderia: formData.guarderiaCodigo || formData.guarderiaNo || "",
      nombreGuarderia: profile?.nombreGuarderia || profile?.guarderiaNombre || formData.guarderiaNombre || "",
      tipoGuarderia: formData.tipoGuarderia || "",
      sala: formData.salaGrupo || "",
      periodoInicio: formData.fechaInicio || "",
      periodoFin: formData.fechaFin || "",
      turno: formData.turno || "",
      responsable: formData.responsableDocente || "",
      numeroNinas: formData.numNinas || 0,
      numeroNinos: formData.numNinos || 0,
      rangoEdad: formData.rangoEdad || "",
      discapacidad: formData.hayDiscapacidad || "No",
      necesidadesEspecificas: formData.descripcionNecesidades || "",
      observaciones: formData.observacionesGrupo || "",
      enfoques: formData.enfoques || [],
      restriccionesMateriales: formData.restriccionesMateriales || "",
      consideracionesSalud: formData.consideracionesSalud || "",
      consideracionesAlimentacion: formData.consideracionesAlimentacion || "",
      notasSeguridad: formData.notasSeguridad || ""
    }
  };

  console.log("Payload enviado a n8n:", payload);

  try {
    // Configuración de Timeout (40 segundos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error en el webhook: ${response.statusText}`);
    }

    const rawData = await response.json();
    console.log("Respuesta cruda n8n:", rawData);

    let normalizedData = rawData;

    // Caso 4: n8n devuelve un arreglo de objetos (muy común en n8n)
    if (Array.isArray(rawData) && rawData.length > 0) {
      normalizedData = rawData[0];
    }

    // Caso 2: Respuesta es un string JSON dentro de un campo 'respuesta'
    if (normalizedData.respuesta && typeof normalizedData.respuesta === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData.respuesta);
      } catch (e) {
        console.error("Error parseando 'respuesta' string:", e);
      }
    } 
    // Caso 3: Datos dentro de un campo 'data'
    else if (normalizedData.data) {
      normalizedData = normalizedData.data;
    }

    console.log("Respuesta normalizada:", normalizedData);

    // Búsqueda ultra-permisiva de campos (ignora mayúsculas/minúsculas y busca sinónimos)
    const findKey = (obj, search) => {
      const keys = Object.keys(obj);
      return keys.find(k => k.toLowerCase().includes(search.toLowerCase()));
    };

    const keyAct = findKey(normalizedData, 'actividad') || 'actividades';
    const keyMat = findKey(normalizedData, 'material') || 'materiales';
    const keyEva = findKey(normalizedData, 'evalua') || 'evaluacion';
    const keyComp = findKey(normalizedData, 'complementaria') || 'actividadesComplementarias';

    const actividadesRaw = normalizedData[keyAct];
    
    // Validación crítica: Si no hay actividades, activamos el fallback local
    if (!actividadesRaw || (Array.isArray(actividadesRaw) && actividadesRaw.length === 0)) {
      console.warn("n8n no devolvió actividades válidas. Activando fallback.");
      throw new Error("Contenido pedagógico ausente o vacío");
    }

    // Mapeo final a la estructura de la aplicación
    return {
      actividadesDetalladas: (Array.isArray(actividadesRaw) ? actividadesRaw : [actividadesRaw]).map(act => ({
        nombre: typeof act === 'string' ? act.substring(0, 50) : (act.nombre || "Actividad Sugerida"),
        proposito: act.proposito || "Propósito pedagógico sugerido",
        desarrollo: act.desarrollo || (typeof act === 'string' ? act : "Desarrollo de la actividad"),
        duracion: act.duracion || "20 min",
        materiales: Array.isArray(act.materiales) ? act.materiales.join(', ') : (act.materiales || "Materiales de la sala"),
        seguridad: act.seguridad || "Supervisión constante",
        dimension: act.dimension || "Desarrollo Integral"
      })),
      materiales: Array.isArray(normalizedData[keyMat]) ? normalizedData[keyMat] : (normalizedData[keyMat] ? [normalizedData[keyMat]] : []),
      evaluacionCriterios: Array.isArray(normalizedData[keyEva]) 
        ? normalizedData[keyEva] 
        : (normalizedData[keyEva] ? [normalizedData[keyEva]] : ["Participación activa"]),
      complementarias: (Array.isArray(normalizedData[keyComp]) ? normalizedData[keyComp] : (normalizedData[keyComp] ? [normalizedData[keyComp]] : [])).map(comp => ({
        nombre: typeof comp === 'string' ? comp : (comp.nombre || "Actividad Complementaria"),
        descripcion: comp.descripcion || (typeof comp === 'string' ? comp : "")
      }))
    };
  } catch (error) {
    console.error("Error al conectar con n8n:", error);
    throw error;
  }
};
