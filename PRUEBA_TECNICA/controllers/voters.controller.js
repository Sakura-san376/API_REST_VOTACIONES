// controllers/voters.controller.js
const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

// Helpers simples
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /voters
exports.create = asyncHandler(async (req, res) => {
  const { name, email } = req.body || {};

  // Validaciones básicas
  if (!name || !email) {
    const err = new Error("name y email son obligatorios");
    err.status = 400;
    throw err;
  }
  if (!emailRegex.test(email)) {
    const err = new Error("email no es válido");
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Restricción: un votante no puede ser candidato (usaremos nombre como clave de cruce).
    const [candByName] = await conn.query(
      "SELECT id FROM candidate WHERE name = ? LIMIT 1",
      [name]
    );
    if (candByName.length) {
      const err = new Error("No se puede registrar este votante: ya existe como candidato");
      err.status = 409;
      throw err;
    }

    // Verificar email único en voter
    const [exists] = await conn.query(
      "SELECT id FROM voter WHERE email = ? LIMIT 1",
      [email]
    );
    if (exists.length) {
      const err = new Error("El email ya está registrado");
      err.status = 409;
      throw err;
    }

    // Crear votante
    const [result] = await conn.query(
      "INSERT INTO voter (name, email, has_voted) VALUES (?, ?, 0)",
      [name, email]
    );

    await conn.commit();

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      has_voted: 0,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// GET /voters
// GET /voters (con paginación y filtrado)
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, name, email } = req.query;

  const offset = (page - 1) * limit;

  // Filtros opcionales: name y email
  const filters = [];
  const values = [];

  let query = "SELECT id, name, email, has_voted, created_at FROM voter";

  if (name) {
    filters.push("name LIKE ?");
    values.push(`%${name}%`);
  }

  if (email) {
    filters.push("email LIKE ?");
    values.push(`%${email}%`);
  }

  if (filters.length > 0) {
    query += " WHERE " + filters.join(" AND ");
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;
  values.push(Number(limit), Number(offset));

  // Ejecutar la consulta con filtros y paginación
  const [rows] = await pool.query(query, values);

  // Obtener el total de registros sin paginación
  const [countResult] = await pool.query("SELECT COUNT(*) AS total FROM voter");
  const total = countResult[0].total;

  res.json({
    data: rows,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    perPage: Number(limit),
  });
});


// GET /voters/:id
exports.getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.query(
    "SELECT id, name, email, has_voted, created_at FROM voter WHERE id = ?",
    [id]
  );

  if (!rows.length) {
    const err = new Error("Votante no encontrado");
    err.status = 404;
    throw err;
  }

  res.json(rows[0]);
});

// DELETE /voters/:id
exports.remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }

  try {
    const [result] = await pool.query("DELETE FROM voter WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      const err = new Error("Votante no encontrado");
      err.status = 404;
      throw err;
    }

    // Si tenía votos asociados, MySQL lanzará error de FK (1451) por RESTRICT
    res.json({ deleted: true, id });
  } catch (e) {
    // Error de clave foránea: tiene un voto registrado
    // ER_ROW_IS_REFERENCED_2 = 1451
    if (e?.errno === 1451) {
      const err = new Error(
        "No se puede eliminar: el votante ya tiene un voto registrado"
      );
      err.status = 409;
      throw err;
    }
    throw e;
  }
});
