// ===============================================================
// Archivo 3 de 4: consultas con filtros, operadores y uniones
// entre colecciones ($lookup) sobre la base saludRedIPS.
// ===============================================================
use("saludRedIPS");

// ---------------------------------------------------------------
// F1. Operadores de comparación y lógicos ($gte, $lte, $in, $or):
// citas atendidas en Medellín o Quibdó con valor entre 70.000 y
// 120.000 pesos
// ---------------------------------------------------------------
db.citas.find(
  { estado: "Atendida",
    sede_id: { $in: ["SED01", "SED02"] },
    valor: { $gte: 70000, $lte: 120000 } },
  { _id: 1, sede_id: 1, tipo: 1, valor: 1, "diagnostico.descripcion": 1 }
).sort({ valor: -1 }).limit(6);

// F2. Operadores sobre arreglos ($size, $all) y $or: pacientes con
// dos enfermedades crónicas o alérgicos a penicilina e ibuprofeno
db.pacientes.find(
  { $or: [ { enfermedades_cronicas: { $size: 2 } },
           { alergias: { $all: ["Penicilina", "Ibuprofeno"] } } ] },
  { _id: 0, nombre: 1, alergias: 1, enfermedades_cronicas: 1 }
);

// F3. $exists, $regex y fechas: pacientes nacidos antes de 1965
// (adultos mayores) cuyo apellido contiene "Mosquera" o "Palacios"
db.pacientes.find(
  { fecha_nacimiento: { $lt: ISODate("1965-01-01T00:00:00Z") },
    nombre: { $regex: /Mosquera|Palacios/ },
    "contacto.correo": { $exists: true } },
  { _id: 0, nombre: 1, fecha_nacimiento: 1, eps: 1 }
);

// F4. Filtro sobre campo embebido con explain(): las citas con
// diagnóstico de hipertensión (I10) usan el índice diagnostico.cie10
const plan = db.citas.find({ "diagnostico.cie10": "I10" }).explain("executionStats");
print("Etapa ganadora: " + plan.queryPlanner.winningPlan.inputStage.stage + " sobre " + plan.queryPlanner.winningPlan.inputStage.indexName);
print("Documentos devueltos: " + plan.executionStats.nReturned + " | documentos revisados: " + plan.executionStats.totalDocsExamined + " de " + db.citas.countDocuments());

// ---------------------------------------------------------------
// J1. JOIN ($lookup) citas -> pacientes -> médicos: historia de
// atención de un paciente con el nombre del médico y la sede
// ---------------------------------------------------------------
db.citas.aggregate([
  { $match: { paciente_id: "PAC0004", estado: "Atendida" } },
  { $lookup: { from: "pacientes", localField: "paciente_id", foreignField: "_id", as: "paciente" } },
  { $lookup: { from: "medicos",   localField: "medico_id",   foreignField: "_id", as: "medico" } },
  { $lookup: { from: "sedes",     localField: "sede_id",     foreignField: "_id", as: "sede" } },
  { $unwind: "$paciente" }, { $unwind: "$medico" }, { $unwind: "$sede" },
  { $project: { _id: 0, fecha: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
                paciente: "$paciente.nombre", medico: "$medico.nombre",
                especialidad: "$medico.especialidad", sede: "$sede.nombre",
                diagnostico: "$diagnostico.descripcion" } },
  { $sort: { fecha: 1 } }
]);

// J2. JOIN con pipeline: cada sede con sus médicos (arreglo
// reducido a nombre y especialidad)
db.sedes.aggregate([
  { $lookup: { from: "medicos", localField: "_id", foreignField: "sede_id", as: "medicos",
               pipeline: [ { $project: { _id: 0, nombre: 1, especialidad: 1 } } ] } },
  { $project: { _id: 0, nombre: 1, ciudad: 1, total_medicos: { $size: "$medicos" }, medicos: 1 } }
]);

// J3. JOIN inverso: pacientes alérgicos a la penicilina que
// recibieron alguna fórmula (alerta de seguridad del paciente)
db.pacientes.aggregate([
  { $match: { alergias: "Penicilina" } },
  { $lookup: { from: "citas", localField: "_id", foreignField: "paciente_id", as: "citas" } },
  { $unwind: "$citas" },
  { $match: { "citas.estado": "Atendida" } },
  { $project: { _id: 0, paciente: "$nombre", cita: "$citas._id",
                medicamento: { $first: "$citas.medicamentos.nombre" } } },
  { $limit: 8 }
]);
