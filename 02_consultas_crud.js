// ===============================================================
// Archivo 2 de 4: consultas básicas CRUD (crear, leer, actualizar
// y eliminar) sobre la base saludRedIPS.
// ===============================================================
use("saludRedIPS");

// ---------------------------------------------------------------
// C1. INSERCIÓN: registrar una paciente nueva (documento con
// subdocumentos y arreglos embebidos)
// ---------------------------------------------------------------
db.pacientes.insertOne({
  _id: "PAC0061",
  documento: { tipo: "CC", numero: "1077456123" },
  nombre: "Johana Andrea Mosquera",
  sexo: "F",
  fecha_nacimiento: ISODate("1996-04-18T00:00:00Z"),
  eps: "Nueva EPS",
  regimen: "Contributivo",
  contacto: { telefono: "3104567890", correo: "johana96@correo.com", ciudad: "Quibdó" },
  alergias: ["Penicilina"],
  enfermedades_cronicas: [],
  fecha_registro: new Date()
});

// C2. INSERCIÓN: agendarle una cita de medicina general en Quibdó
db.citas.insertOne({
  _id: "CIT00161", paciente_id: "PAC0061", medico_id: "MED004", sede_id: "SED02",
  fecha: ISODate("2026-11-20T08:00:00Z"), tipo: "Primera vez", estado: "Programada",
  valor: 45000, copago: 5400
});

// C3. INSERCIÓN QUE FALLA A PROPÓSITO: la validación $jsonSchema
// rechaza un estado que no existe ("Pendiente")
try {
  db.citas.insertOne({ _id: "CIT99999", paciente_id: "PAC0061", medico_id: "MED004", sede_id: "SED02",
                       fecha: new Date(), tipo: "Control", estado: "Pendiente", valor: 45000 });
} catch (e) { print("Documento rechazado por el validador: " + e.errInfo.details.operatorName); }

// ---------------------------------------------------------------
// R1. SELECCIÓN: buscar la paciente por su documento (usa el
// índice único documento.numero)
// ---------------------------------------------------------------
db.pacientes.findOne({ "documento.numero": "1077456123" });

// R2. SELECCIÓN CON PROYECCIÓN Y ORDEN: pacientes del régimen
// subsidiado, solo nombre, EPS y ciudad, ordenados por nombre
db.pacientes.find(
  { regimen: "Subsidiado" },
  { _id: 0, nombre: 1, eps: 1, "contacto.ciudad": 1 }
).sort({ nombre: 1 }).limit(8);

// ---------------------------------------------------------------
// U1. ACTUALIZACIÓN: la cita se atendió; se cambia el estado y se
// embebe el diagnóstico, los signos vitales y la fórmula
// ---------------------------------------------------------------
db.citas.updateOne(
  { _id: "CIT00161" },
  { $set: {
      estado: "Atendida",
      diagnostico: { cie10: "J06.9", descripcion: "Infección respiratoria aguda" },
      signos_vitales: { presion: "118/76", frecuencia_cardiaca: 82, temperatura: 37.8, peso_kg: 61.5 },
      medicamentos: [{ nombre: "Acetaminofén", dosis: "1 cada 8 h", dias: 5 }],
      duracion_min: 20, calificacion: 5
  } }
);
db.citas.findOne({ _id: "CIT00161" }, { estado: 1, diagnostico: 1, medicamentos: 1 });

// U2. ACTUALIZACIÓN DE ARREGLO: agregar una alergia sin repetirla
db.pacientes.updateOne({ _id: "PAC0061" }, { $addToSet: { alergias: "Ibuprofeno" } });
db.pacientes.findOne({ _id: "PAC0061" }, { nombre: 1, alergias: 1 });

// U3. ACTUALIZACIÓN MASIVA: subir 5 % la tarifa de cardiología
print("Antes:");   printjson(db.medicos.find({ especialidad: "Cardiología" }, { tarifa_consulta: 1 }).toArray());
printjson(db.medicos.updateMany({ especialidad: "Cardiología" }, { $mul: { tarifa_consulta: 1.05 } }));
print("Después:"); db.medicos.find({ especialidad: "Cardiología" }, { tarifa_consulta: 1 });

// ---------------------------------------------------------------
// D1. ELIMINACIÓN DE UN DOCUMENTO: borrar la cita de prueba
// ---------------------------------------------------------------
db.citas.deleteOne({ _id: "CIT00161" });

// D2. ELIMINACIÓN MASIVA: depurar las citas canceladas de julio
print("Canceladas de julio: " + db.citas.countDocuments({ estado: "Cancelada", fecha: { $lt: ISODate("2026-08-01T00:00:00Z") } }));
printjson(db.citas.deleteMany({ estado: "Cancelada", fecha: { $lt: ISODate("2026-08-01T00:00:00Z") } }));
print("Citas restantes: " + db.citas.countDocuments());
