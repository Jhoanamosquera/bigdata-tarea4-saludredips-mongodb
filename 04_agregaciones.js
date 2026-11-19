// ===============================================================
// Archivo 4 de 4: consultas de agregación para calcular
// estadísticas (contar, sumar, promediar, máximos, rangos) sobre la
// base saludRedIPS.
// ===============================================================
use("saludRedIPS");

// A1. CONTAR: citas por estado y porcentaje sobre el total
db.citas.aggregate([
  { $group: { _id: "$estado", citas: { $sum: 1 } } },
  { $group: { _id: null, total: { $sum: "$citas" }, estados: { $push: "$$ROOT" } } },
  { $unwind: "$estados" },
  { $project: { _id: 0, estado: "$estados._id", citas: "$estados.citas",
                porcentaje: { $round: [{ $multiply: [{ $divide: ["$estados.citas", "$total"] }, 100] }, 1] } } },
  { $sort: { citas: -1 } }
]);

// A2. SUMAR: ingresos y copagos de las citas atendidas por sede
db.citas.aggregate([
  { $match: { estado: "Atendida" } },
  { $group: { _id: "$sede_id", atenciones: { $sum: 1 },
              ingresos: { $sum: "$valor" }, copagos: { $sum: "$copago" } } },
  { $lookup: { from: "sedes", localField: "_id", foreignField: "_id", as: "sede" } },
  { $project: { _id: 0, sede: { $first: "$sede.nombre" }, atenciones: 1, ingresos: 1, copagos: 1 } },
  { $sort: { ingresos: -1 } }
]);

// A3. PROMEDIAR: calificación y duración media por especialidad
db.citas.aggregate([
  { $match: { estado: "Atendida" } },
  { $lookup: { from: "medicos", localField: "medico_id", foreignField: "_id", as: "medico" } },
  { $unwind: "$medico" },
  { $group: { _id: "$medico.especialidad", atenciones: { $sum: 1 },
              calificacion_prom: { $avg: "$calificacion" },
              duracion_prom_min: { $avg: "$duracion_min" },
              valor_max: { $max: "$valor" } } },
  { $project: { atenciones: 1, valor_max: 1,
                calificacion_prom: { $round: ["$calificacion_prom", 2] },
                duracion_prom_min: { $round: ["$duracion_prom_min", 1] } } },
  { $sort: { calificacion_prom: -1 } }
]);

// A4. TOP 5 de diagnósticos (CIE-10) más frecuentes
db.citas.aggregate([
  { $match: { diagnostico: { $exists: true } } },
  { $group: { _id: { cie10: "$diagnostico.cie10", descripcion: "$diagnostico.descripcion" }, casos: { $sum: 1 } } },
  { $sort: { casos: -1 } },
  { $limit: 5 }
]);

// A5. Edad promedio de los pacientes por EPS ($dateDiff)
db.pacientes.aggregate([
  { $set: { edad: { $dateDiff: { startDate: "$fecha_nacimiento", endDate: "$$NOW", unit: "year" } } } },
  { $group: { _id: "$eps", pacientes: { $sum: 1 }, edad_prom: { $avg: "$edad" },
              edad_min: { $min: "$edad" }, edad_max: { $max: "$edad" } } },
  { $set: { edad_prom: { $round: ["$edad_prom", 1] } } },
  { $sort: { pacientes: -1 } }
]);

// A6. Inasistencia por tipo de cita ($cond): qué modalidad pierde
// más citas
db.citas.aggregate([
  { $match: { estado: { $ne: "Programada" } } },
  { $group: { _id: "$tipo", total: { $sum: 1 },
              no_asistio: { $sum: { $cond: [{ $eq: ["$estado", "No asistió"] }, 1, 0] } } } },
  { $project: { total: 1, no_asistio: 1,
                tasa_inasistencia: { $round: [{ $multiply: [{ $divide: ["$no_asistio", "$total"] }, 100] }, 1] } } },
  { $sort: { tasa_inasistencia: -1 } }
]);

// A7. Distribución de pacientes por grupo de edad ($bucket)
db.pacientes.aggregate([
  { $set: { edad: { $dateDiff: { startDate: "$fecha_nacimiento", endDate: "$$NOW", unit: "year" } } } },
  { $bucket: { groupBy: "$edad", boundaries: [0, 18, 30, 45, 60, 120], default: "Sin dato",
               output: { pacientes: { $sum: 1 }, con_cronica: { $sum: { $cond: [{ $gt: [{ $size: "$enfermedades_cronicas" }, 0] }, 1, 0] } } } } }
]);

// A8. Citas atendidas por mes ($dateToString) para ver la demanda
db.citas.aggregate([
  { $match: { estado: "Atendida" } },
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$fecha" } },
              atenciones: { $sum: 1 }, ingresos: { $sum: "$valor" } } },
  { $sort: { _id: 1 } }
]);
