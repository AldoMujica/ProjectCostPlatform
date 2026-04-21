/**
 * API Integration Layer - Wrapper para todos los endpoints de Conciliación
 * Uso: import { API } from './api.js'
 */

class API {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('jwt_token');
  }

  /**
   * Actualizar token cuando usuario se loguea
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('jwt_token', token);
  }

  /**
   * Obtener headers con autenticación
   */
  getHeaders(isFormData = false) {
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Método genérico para requests
   */
  async request(endpoint, method = 'GET', body = null, isFormData = false) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders(isFormData)
    };

    if (body && method !== 'GET') {
      if (isFormData) {
        options.body = body;
        delete options.headers['Content-Type']; // FormData establece el content-type automáticamente
      } else {
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        console.error('Error API:', data);
        throw new Error(data.mensaje || 'Error en la solicitud');
      }

      return data;
    } catch (error) {
      console.error('Error en request:', error);
      throw error;
    }
  }

  // ========== ENDPOINTS DE CHECADOR ==========

  /**
   * Previsualizar carga de checador
   * POST /api/conciliacion/checador/preview
   */
  async previewChecador(file) {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.request('/conciliacion/checador/preview', 'POST', formData, true);
  }

  /**
   * Importar checador confirmado
   * POST /api/conciliacion/checador/importar
   */
  async importarChecador(tempFilePath, semanaId) {
    return this.request('/conciliacion/checador/importar', 'POST', {
      temp_file: tempFilePath,
      semana_id: semanaId
    });
  }

  // ========== ENDPOINTS DE CONCILIACIÓN SEMANAL ==========

  /**
   * Obtener resumen semanal
   * GET /api/conciliacion/:semana_id
   */
  async getConciliacionSemanal(semanaId, filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.area) params.append('area', filtros.area);
    if (filtros.estado) params.append('estado', filtros.estado);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/conciliacion/${semanaId}${queryString}`);
  }

  /**
   * Obtener detalle de empleado en la semana
   * GET /api/conciliacion/:semana_id/:empleado_id
   */
  async getDetalleEmpleado(semanaId, empleadoId) {
    return this.request(`/conciliacion/${semanaId}/${empleadoId}`);
  }

  // ========== ENDPOINTS DE JUSTIFICACIÓN ==========

  /**
   * Registrar justificación
   * POST /api/conciliacion/justificar
   */
  async registrarJustificacion(empleadoId, fecha, semanaId, justificacion) {
    return this.request('/conciliacion/justificar', 'POST', {
      empleado_id: empleadoId,
      fecha,
      semana_id: semanaId,
      justificacion
    });
  }

  /**
   * Forzar conciliación (solo RH/admin)
   * POST /api/conciliacion/forzar
   */
  async forzarConciliacion(empleadoId, fecha, semanaId, motivo) {
    return this.request('/conciliacion/forzar', 'POST', {
      empleado_id: empleadoId,
      fecha,
      semana_id: semanaId,
      motivo
    });
  }

  // ========== ENDPOINTS DE ALERTAS ==========

  /**
   * Obtener alertas de la semana
   * GET /api/conciliacion/:semana_id/alertas
   */
  async getAlertas(semanaId, filtro = null) {
    const queryString = filtro ? `?tipo=${filtro}` : '';
    return this.request(`/conciliacion/${semanaId}/alertas${queryString}`);
  }

  // ========== ENDPOINTS DE HORAS CLASIFICADAS ==========

  /**
   * Crear nueva clasificación de horas
   * POST /api/conciliacion/horas-clasificadas
   */
  async crearHorasClasificadas(empleadoId, fecha, proyectoId, actividad, horas, tipoHora = 'normal') {
    return this.request('/conciliacion/horas-clasificadas', 'POST', {
      empleado_id: empleadoId,
      fecha,
      proyecto_id: proyectoId,
      actividad,
      horas,
      tipo_hora: tipoHora
    });
  }

  /**
   * Obtener horas clasificadas
   * GET /api/conciliacion/horas-clasificadas/:semana_id/:empleado_id
   */
  async getHorasClasificadas(semanaId, empleadoId) {
    return this.request(`/conciliacion/horas-clasificadas/${semanaId}/${empleadoId}`);
  }

  /**
   * Actualizar horas clasificadas
   * PUT /api/conciliacion/horas-clasificadas/:id
   */
  async actualizarHorasClasificadas(id, datos) {
    return this.request(`/conciliacion/horas-clasificadas/${id}`, 'PUT', datos);
  }

  /**
   * Eliminar horas clasificadas
   * DELETE /api/conciliacion/horas-clasificadas/:id
   */
  async eliminarHorasClasificadas(id) {
    return this.request(`/conciliacion/horas-clasificadas/${id}`, 'DELETE');
  }

  // ========== ENDPOINTS DE CIERRE ==========

  /**
   * Cerrar semana (irreversible)
   * POST /api/conciliacion/:semana_id/cerrar
   */
  async cerrarSemana(semanaId) {
    return this.request(`/conciliacion/${semanaId}/cerrar`, 'POST');
  }

  /**
   * Exportar reporte en Excel
   * GET /api/conciliacion/:semana_id/exportar
   */
  async exportarExcel(semanaId) {
    try {
      const response = await fetch(`${this.baseURL}/conciliacion/${semanaId}/exportar`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nomina_${semanaId}_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error en exportación:', error);
      throw error;
    }
  }

  // ========== UTILIDADES ==========

  /**
   * Manejar error 401 (token expirado)
   */
  static handleUnauthorized() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/login.html';
  }

  /**
   * Formatear error para mostrar al usuario
   */
  static formatError(error) {
    if (error.message) {
      return error.message;
    }
    return 'Error desconocido. Intenta de nuevo.';
  }
}

// Crear instancia global
const api = new API();

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API, api };
}
