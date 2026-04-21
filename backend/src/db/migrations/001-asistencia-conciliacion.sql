-- Tabla de Empleados
CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  numero_lista VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  turno VARCHAR(20) NOT NULL DEFAULT '08:00-17:00',
  area VARCHAR(100) NOT NULL,
  supervisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Semanas de Nómina
CREATE TABLE IF NOT EXISTS semanas_nomina (
  id SERIAL PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  descripcion VARCHAR(100),
  cerrada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fecha_inicio, fecha_fin)
);

-- Tabla de Registros del Checador
CREATE TABLE IF NOT EXISTS registros_checador (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  horas_real DECIMAL(5,2),
  anomalia VARCHAR(100),
  semana_id INTEGER REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  importado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(empleado_id, fecha, semana_id)
);

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Horas Clasificadas
CREATE TABLE IF NOT EXISTS horas_clasificadas (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE SET NULL,
  actividad VARCHAR(100) NOT NULL,
  horas DECIMAL(5,2) NOT NULL,
  tipo_hora VARCHAR(20) DEFAULT 'normal',
  capturado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  semana_id INTEGER NOT NULL REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  conciliacion_estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Incidencias
CREATE TABLE IF NOT EXISTS incidencias (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  semana_id INTEGER NOT NULL REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empleado_id, fecha, semana_id)
);

-- Tabla de Detalle de Conciliación
CREATE TABLE IF NOT EXISTS conciliacion_detalle (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  horas_checador DECIMAL(5,2),
  horas_clasificadas DECIMAL(5,2),
  diferencia DECIMAL(5,2),
  estado VARCHAR(20) DEFAULT 'pendiente',
  justificacion TEXT,
  justificado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  semana_id INTEGER NOT NULL REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empleado_id, fecha, semana_id)
);

-- Tabla de Cierres de Semana (Auditoría)
CREATE TABLE IF NOT EXISTS cierres_semana (
  id SERIAL PRIMARY KEY,
  semana_id INTEGER NOT NULL UNIQUE REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  aprobado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  aprobado_en TIMESTAMP DEFAULT NOW(),
  total_empleados INTEGER NOT NULL,
  total_horas DECIMAL(8,2) NOT NULL,
  diferencias_pendientes INTEGER DEFAULT 0,
  costo_estimado DECIMAL(12,2),
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_registros_checador_empleado_fecha ON registros_checador(empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_registros_checador_semana ON registros_checador(semana_id);
CREATE INDEX IF NOT EXISTS idx_horas_clasificadas_empleado_fecha ON horas_clasificadas(empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_horas_clasificadas_semana ON horas_clasificadas(semana_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_empleado_fecha ON incidencias(empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_conciliacion_detalle_empleado_semana ON conciliacion_detalle(empleado_id, semana_id);
CREATE INDEX IF NOT EXISTS idx_empleados_area ON empleados(area);
CREATE INDEX IF NOT EXISTS idx_empleados_supervisor ON empleados(supervisor_id);

-- Extender tabla de usuarios si no existe (si es necesario)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'supervisor';
