# Módulo de Conciliación de Asistencia y Horas - Alenstec

Módulo web completo para conciliación de asistencia y horas trabajadas en una planta de manufactura. Sistema integrado en Alenstec que reconcilia datos de checador, horas clasificadas e incidencias antes del cierre semanal de nómina.

---

## 📋 Descripción General

Este módulo automatiza el proceso de conciliación de asistencia para una planta de manufactura, comparando tres fuentes de datos:

1. **Checador**: Registros de entrada/salida del sistema de control de acceso
2. **Horas Clasificadas**: Horas registradas por supervisores por proyecto/actividad
3. **Incidencias**: Ausencias validadas (vacaciones, incapacidades, festivos)

**Resultado**: Detección automática de discrepancias con alertas por severidad y cierre irreversible de nómina.

---

## Try it locally (demo data)

```bash
cd backend
npm run seed
# seeds 6 role users + cost fixtures + 5 empleados + one semana_nomina
# (Apr 13–17, 2026). Run `npm run seed:conciliacion` if you only want
# to refresh the conciliación slice.
```

Then in the SPA, open module 9 (Conciliación) and upload `backend/fixtures/checador-sample.csv` in sub-tab 9.1. The CSV exercises normal days, overtime, a missing check-out (empleado 004, 15 Apr) and a late arrival (empleado 005, 14 Apr). Use the `semana_id` printed by the seed when you confirm the import.

---

## 🏗️ Arquitectura

### Frontend (Vanilla JavaScript + HTML5 + CSS3)
```
backend/public/
├── login.html                    # Autenticación JWT
├── conciliacion-semanal.html     # Dashboard principal (tabla con color-coding)
├── detalle-empleado.html         # Vista día-a-día per empleado
├── alertas.html                  # Centro de alertas ordenadas por severidad
├── carga-checador.html           # Upload CSV/XLSX con preview
├── captura-horas.html            # Formulario para supervisor (ingreso de horas)
├── cierre-semana.html            # Cierre de nómina + exportación Excel
└── js/
    └── api.js                    # Cliente API unificado (fetch wrapper)
```

### Backend (Node.js + Express + PostgreSQL)
```
backend/src/
├── server.js                     # Aplicación Express principal
├── config/
│   └── database.js               # Conexión PostgreSQL
├── middleware/
│   └── auth.js                   # JWT verificación + role filtering
├── services/
│   ├── conciliacionService.js    # Motor de conciliación (3-source logic)
│   └── parserChecadorService.js  # Parser CSV/XLSX con normalización
├── routes/
│   └── conciliacionRoutes.js     # 13 endpoints RESTful
├── utils/
│   └── excelExporter.js          # Generador de reportes Excel
└── db/
    └── migrations/
        └── 001-asistencia-conciliacion.sql  # Schema (9 tablas)
```

---

## 🗄️ Base de Datos (PostgreSQL)

### 9 Tablas Principales

| Tabla | Propósito | Campos Clave |
|-------|-----------|--------------|
| **empleados** | Master de empleados | numero_lista, nombre, supervisor_id, turno, area |
| **semanas_nomina** | Períodos de nómina | semana_id, fecha_inicio, fecha_fin, cerrada |
| **registros_checador** | Importación de checador | empleado_id, fecha, check_in, check_out, horas_real |
| **horas_clasificadas** | Ingreso supervisor | empleado_id, fecha, proyecto_id, actividad, horas |
| **incidencias** | Ausencias/vacaciones | empleado_id, fecha, tipo (vacacion/incapacidad/festivo) |
| **conciliacion_detalle** | Resultado reconciliación | empleado_id, fecha, semana_id, estado, diferencia, justificacion |
| **cierres_semana** | Auditoría irreversible | semana_id, cerrada_por, cerrada_en, total_empleados |
| **proyectos** | Catálogo proyectos | proyecto_id, nombre |
| **usuarios** | Cuentas con roles | user_id, email, rol (supervisor/jefe_area/rh/admin) |

**Constraints**:
- `UNIQUE(empleado_id, fecha, semana_id)` en conciliacion_detalle
- `ON DELETE CASCADE` para integridad referencial
- 8 índices optimizados para queries frecuentes

---

## 🔐 Autenticación y Roles

### Sistema JWT
- Token generado al login con expiración (24 horas en demostración)
- Almacenado en `localStorage`
- Inyectado en header Authorization: `Bearer {token}`

### 4 Roles con Acceso Diferenciado

| Rol | Vistas | Acciones | Restricciones |
|-----|--------|----------|---------------|
| **supervisor** | Solo empleados a cargo | Capturar horas, justificar | No ve otros supervisores |
| **jefe_area** | Todos sus empleados | Aprobar horas extra | Acceso limitado a su área |
| **rh** | Todos | Forzar reconciliación, cerrar semana | Acceso completo operativo |
| **admin** | Todos | Todas las acciones | Acceso total sin restricciones |

---

## 🔄 Flujo de Conciliación

### Algoritmo (conciliacionService.js)

```javascript
Para cada empleado-día:
  1. Obtener horas_checador (suma de duraciones entrada-salida)
  2. Obtener horas_clasificadas (suma de capturas supervisor)
  3. Verificar incidencias válidas (vacacion/incapacidad/festivo)
  
  SI hay incidencia válida:
    estado = OK (auto-pasa)
    diferencia = 0
  SINO:
    diferencia = |checador - clasificadas|
    
    SI diferencia <= 0.5h:
      estado = OK (verde)
    SINO SI diferencia <= 2h:
      estado = ALERTA (amarillo)
      Generar alerta de tipo diferencia_media
    SINO:
      estado = CONFLICTO (rojo)
      Generar alerta de tipo diferencia_significativa
      Requerir justificación
```

### Estados Finales
- **ok**: Conciliado automáticamente (≤0.5h diferencia)
- **alerta**: Diferencia 0.5-2h (revisión recomendada)
- **conflicto**: Diferencia >2h (requiere justificación)
- **justificado**: Conflict resuelta con justificación
- **forzada**: Override de RH/admin

---

## 📊 13 Endpoints API

### Checador
```
POST /api/conciliacion/checador/preview
- Upload archivo CSV/XLSX
- Retorna preview (primeros 20 registros)
- Guarda temp file por 30 min

POST /api/conciliacion/checador/importar
- Confirma import desde temp file
- Dispara auto-conciliación semanal
- Retorna: {exitoso, total_importados, con_anomalias}
```

### Conciliación
```
GET /api/conciliacion/:semana_id
- Dashboard semanal: resumen + empleados
- Filtros: area, estado
- Role filter: supervisors ven solo sus empleados

GET /api/conciliacion/:semana_id/:empleado_id
- Detail día-a-día: check-in/out, horas, proyectos

POST /api/conciliacion/justificar
- Registra explicación para diferencia
- Actualiza estado → justificado

POST /api/conciliacion/forzar (RH/admin only)
- Override de reconciliación
- Motivo en base de datos
```

### Alertas
```
GET /api/conciliacion/:semana_id/alertas
- Lista alertas por severidad
- Tipos: sin_checada, horas_extra, clasificadas_mayores, etc.
- Ordenadas: critico > media > baja
```

### Horas Clasificadas
```
POST /api/conciliacion/horas-clasificadas
- Supervisor captura: empleado, fecha, proyecto, actividad, horas
- Validación: rechazo si no hay checada ese día
- Auto-recalcula conciliación

GET/PUT/DELETE /api/conciliacion/horas-clasificadas/:id
- CRUD operaciones
```

### Cierre
```
POST /api/conciliacion/:semana_id/cerrar (RH/admin only)
- Verifica readiness: sin conflictos sin resolver
- Marca semana como cerrada (irreversible)
- Nuevo registro en cierres_semana (audit trail)

GET /api/conciliacion/:semana_id/exportar
- Genera Excel con formato nómina
- Descarga directa
```

---

## 🧠 Parser de Checador (parserChecadorService.js)

### Características
- **Formatos**: CSV y XLSX (auto-detección)
- **Normalización de tiempos**: 5 formatos soportados
  - HH:mm:ss (06:30:45)
  - HH:mm (06:30)
  - HHmm (0630)
  - h:mm A (6:30 AM)
  - hh:mm A (06:30 PM)
- **Cálculo de horas**: Detecta cruces de medianoche
- **Validación**: Cross-reference empleado_id contra BD

### Anomalías Detectadas
- Sin salida (entry sin exit)
- Entrada sin salida lógica
- Duración <30min (error de ingreso)
- Duración >14h (fuera de rango)
- Empleado no existe en sistema

### Salida
```json
{
  "registros": [
    {
      "empleado_id": "E001",
      "fecha": "2024-01-15",
      "check_in": "06:00:00",
      "check_out": "14:30:00",
      "horas_real": 8.5,
      "anomalia": null
    }
  ],
  "errores": [
    {"fila": 5, "errores": ["Empleado no existe"]}
  ],
  "totalLeidos": 250,
  "totalValidos": 240,
  "totalErrores": 10
}
```

---

## 🎨 Interfaz de Usuario

### Paleta de Colores
- **Sidebar**: Dark (#2c3e50)
- **Content**: Light white backgrounds
- **OK**: Verde (#27ae60)
- **Alerta**: Amarillo (#f39c12)
- **Conflicto**: Rojo (#e74c3c)
- **Justificado**: Azul (#3498db)

### Diseño Responsive
- Mínimo: 1280px ancho (desktop-first)
- Sidebar fijo: 250px ancho
- Main content ajustable
- Grid CSS responsive

### 7 Páginas HTML

1. **login.html**: Form JWT + usuarios demo para testing
2. **conciliacion-semanal.html**: Dashboard principal (tabla con color-coding)
3. **detalle-empleado.html**: Drawer modal con detalles día-a-día
4. **alertas.html**: Centro de alertas por severidad
5. **carga-checador.html**: Upload + preview + validación pre-import
6. **captura-horas.html**: Form para supervisor ingesar horas clasificadas
7. **cierre-semana.html**: Validación pre-cierre + botón irreversible

---

## ⚙️ Instalación y Setup

### Prerequisitos
- Node.js v14+
- PostgreSQL 12+
- npm o yarn

### Pasos de Instalación

```bash
# 1. Instalar dependencias
cd backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales PostgreSQL locales

# 3. Crear base de datos
psql -U postgres -c "CREATE DATABASE alenstec_costos;"

# 4. Ejecutar migraciones
psql -U postgres -d alenstec_costos < src/db/migrations/001-asistencia-conciliacion.sql

# 5. (Opcional) Cargar datos de prueba
npm run seed

# 6. Iniciar servidor
npm run dev

# Frontend accesible en http://localhost:3001
```

### Variables de Entorno (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alenstec_costos
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=tu_secret_key_aqui_cambiar_en_prod
JWT_EXPIRATION=24h

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

TOLERANCIA_HORAS=0.5
UMBRAL_ALERTA=2.0
MAX_ARCHIVO_MB=10
```

---

## 📝 Datos de Prueba (Demo)

### Usuarios de Demostración
```
supervisor@alenstec.com / pass123 (Supervisor)
jefe@alenstec.com / pass123 (Jefe Área)
rh@alenstec.com / pass123 (RH)
admin@alenstec.com / admin123 (Admin)
```

### Empleados de Demostración
- E001 a E008 con turnos y áreas variadas
- Datos de checador simulados con anomalías propósito para testing

---

## 🚀 Características Avanzadas

### Transacciones Atómicas
- Imports de checador: BEGIN/COMMIT/ROLLBACK
- Rollback automático si validación falla
- Auditoría de imports con timestamps

### Optimizaciones de Base de Datos
- 8 índices estratégicos en columnas de query frecuente
- JSON aggregation para resumen de semanas
- Query prepared statements (prevención SQL injection)

### Seguridad
- JWT con expiración configurable
- Role-based access control (RBAC) en cada endpoint
- Input validation y sanitización
- Helmet para HTTP headers
- CORS configurado

### Exportación Excel
- Formato nómina profesional
- Styling: headers azul oscuro, data rows blanco/verde/amarillo
- Totales y subtotales automáticos
- ExcelJS para generación programática

---

## 📚 Estructura de Carpetas

```
alenstec-costos/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── middleware/auth.js
│   │   ├── services/
│   │   │   ├── conciliacionService.js
│   │   │   └── parserChecadorService.js
│   │   ├── routes/conciliacionRoutes.js
│   │   ├── utils/excelExporter.js
│   │   ├── db/migrations/001-asistencia-conciliacion.sql
│   │   └── config/database.js
│   ├── public/
│   │   ├── login.html
│   │   ├── conciliacion-semanal.html
│   │   ├── alertas.html
│   │   ├── carga-checador.html
│   │   ├── captura-horas.html
│   │   ├── cierre-semana.html
│   │   ├── detalle-empleado.html
│   │   └── js/api.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── README.md
```

---

## 🔧 Comandos npm

```bash
npm start              # Iniciar servidor producción
npm run dev            # Iniciar con nodemon (desarrollo)
npm run migrate        # Ejecutar migraciones SQL
npm run seed           # Cargar datos de prueba
npm test               # Ejecutar tests (si existen)
```

---

## 📖 Flujo de Usuario Típico

### Supervisor (Captura de Horas)
1. Login con credenciales
2. Navegar a "Captura de Horas"
3. Seleccionar empleado, fecha, proyecto, horas
4. Guardar → Sistema auto-concilia
5. Revisar alertas si hay discrepancias

### RH (Gestión Semanal)
1. Login
2. Dashboard: ver estado conciliación de toda semana
3. Revisar alertas (criterio, media, baja)
4. Cargar checador: Upload CSV/XLSX → Preview → Confirmar
5. Verificar cierres pre-requisitos
6. Cerrar semana (irreversible) → Exportar Excel nómina

### Jefe Área (Aprobación)
1. Login
2. Ver solo empleads bajo su supervisión
3. Justificar diferencias si es necesario
4. Aprobar horas extra clasificadas

---

## ⚠️ Consideraciones Importantes

### Irreversibilidad de Cierres
- Una vez cerrada una semana, no se puede modificar
- La fecha/hora de cierre y usuario se registran
- Auditoría completa en tabla `cierres_semana`

### Validación Pre-Cierre
- No permite cerrar si hay conflictos sin resolver
- Requiere que supervisor de cada área haya revisado
- Checklist de 5 items in UI para validación

### Privacidad de Supervisores
- Supervisores **solo ven** empleados asignados
- Query filter automático: `WHERE supervisor_id = :user_id`
- RH/Admin ven todo sin restricciones

---

## 📞 Soporte y Mantenimiento

### Logs
- Servidor: stdout (stdout en desarrollo)
- BD: query logs si `LOG_SQL=true` en .env

### Troubleshooting
- Puerto 3001 ocupado: cambiar `PORT` en .env
- Err conexión BD: verificar credenciales .env y que PostgreSQL está corriendo
- CORS errors: verificar `FRONTEND_URL` en .env

---

## 📄 Licencia

Este módulo es propiedad de Alenstec y está integrado en el sistema central de costos.

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Autor**: Desarrollo Alenstec

