// controllers/candidates.controller.js
const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

// POST /candidates
exports.create = asyncHandler(async (req, res) => {
  const { name, party = null } = req.body || {};

  if (!name) {
    const err = new Error("name es obligatorio");
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Regla: un candidato no puede ser votante
    const [voterByName] = await conn.query(
      "SELECT id FROM voter WHERE name = ? LIMIT 1",
      [name]
    );
    if (voterByName.length) {
      const err = new Error("No se puede registrar candidato: ya existe como votante");
      err.status = 409;
      throw err;
    }

    // Evitar duplicados por name en candidate
    const [candByName] = await conn.query(
      "SELECT id FROM candidate WHERE name = ? LIMIT 1",
      [name]
    );
    if (candByName.length) {
      const err = new Error("Ya existe un candidato con ese nombre");
      err.status = 409;
      throw err;
    }

    const [result] = await conn.query(
      "INSERT INTO candidate (name, party, votes) VALUES (?, ?, 0)",
      [name, party]
    );

    await conn.commit();
    res.status(201).json({
      id: result.insertId,
      name,
      party,
      votes: 0
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// GET /candidates
// GET /candidates (con paginación y filtrado)
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, name, party } = req.query;

  const offset = (page - 1) * limit;

  // Filtros opcionales: name y party
  const filters = [];
  const values = [];

  let query = "SELECT id, name, party, votes, created_at FROM candidate";

  if (name) {
    filters.push("name LIKE ?");
    values.push(`%${name}%`);
  }

  if (party) {
    filters.push("party LIKE ?");
    values.push(`%${party}%`);
  }

  if (filters.length > 0) {
    query += " WHERE " + filters.join(" AND ");
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;
  values.push(Number(limit), Number(offset));

  // Ejecutar la consulta con filtros y paginación
  const [rows] = await pool.query(query, values);

  // Obtener el total de registros sin paginación
  const [countResult] = await pool.query("SELECT COUNT(*) AS total FROM candidate");
  const total = countResult[0].total;

  res.json({
    data: rows,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    perPage: Number(limit),
  });
});


// GET /candidates/:id
exports.getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.query(
    "SELECT id, name, party, votes, created_at FROM candidate WHERE id = ?",
    [id]
  );
  if (!rows.length) {
    const err = new Error("Candidato no encontrado");
    err.status = 404;
    throw err;
  }
  res.json(rows[0]);
});

// DELETE /candidates/:id
exports.remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM candidate WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      const err = new Error("Candidato no encontrado");
      err.status = 404;
      throw err;
    }
    res.json({ deleted: true, id });
  } catch (e) {
    if (e && e.errno === 1451) {
      const err = new Error(
        "No se puede eliminar: el candidato tiene votos registrados"
      );
      err.status = 409;
      throw err;
    }
    throw e;
  }
});
