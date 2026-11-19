# saludRedIPS – Caso de uso NoSQL con MongoDB

Tarea 4 – Big Data (202016911), UNAD. Autora: Johana Andrea Mosquera Giraldo, grupo 108.

## Caso de uso

Una red de IPS (instituciones prestadoras de salud) con sedes en Medellín, Quibdó, Bogotá, Cali y Pereira
necesita registrar pacientes, médicos y citas cuyos datos varían mucho de un registro a otro:
alergias y enfermedades crónicas como arreglos, y diagnóstico (CIE-10), signos vitales y
fórmulas médicas embebidos en la cita solo cuando esta se atiende. Este esquema flexible
encaja mejor en un modelo de documentos que en tablas relacionales rígidas.

## Modelo de datos (base `saludRedIPS`)

| Colección | Documentos | Campos principales |
|-----------|-----------:|--------------------|
| `sedes`     |   5 | `_id`, nombre, ciudad, direccion, servicios[], capacidad_diaria |
| `medicos`   |  15 | `_id`, nombre, especialidad, `sede_id`, registro_medico, tarifa_consulta, anios_experiencia, activo |
| `pacientes` |  60 | `_id`, documento{tipo, numero}, nombre, sexo, fecha_nacimiento, eps, regimen, contacto{}, alergias[], enfermedades_cronicas[] |
| `citas`     | 160 | `_id`, `paciente_id`, `medico_id`, `sede_id`, fecha, tipo, estado, valor, copago, diagnostico{cie10, descripcion}, signos_vitales{}, medicamentos[], calificacion |

Hay **240 documentos** en total. Cada colección tiene un validador `$jsonSchema`.
Los índices son:

- `documento.numero` (único)
- `eps + regimen`
- `especialidad + sede_id`
- `paciente_id + fecha`
- `medico_id`
- `estado + fecha`
- `diagnostico.cie10`

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `01_creacion_y_carga.js` | Crea la base, las colecciones con validación y los índices, y carga los 240 documentos |
| `02_consultas_crud.js` | Inserción (y una inserción rechazada por el validador), búsquedas, actualizaciones (`$set`, `$addToSet`, `$mul`) y eliminaciones |
| `03_filtros_operadores_join.js` | Operadores `$in`, `$gte/$lte`, `$or`, `$size`, `$all`, `$regex`, `$exists`; `explain()` y uniones con `$lookup` |
| `04_agregaciones.js` | Conteos, sumas y promedios, top de diagnósticos, `$dateDiff`, `$cond`, `$bucket` y demanda mensual |

## Ejecución

Requiere MongoDB 7 o superior y mongosh (o la pestaña mongosh de MongoDB Compass).

```bash
mongosh 01_creacion_y_carga.js
mongosh 02_consultas_crud.js
mongosh 03_filtros_operadores_join.js
mongosh 04_agregaciones.js
```

Los archivos se deben ejecutar en ese orden. `02` modifica y borra datos, así que para
repetir las consultas desde cero hay que volver a ejecutar `01`.
