// controllers/votes.controller.js
const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

// POST /votes  { voter_id, candidate_id }
exports.create = asyncHandler(async (req, res) => {
  const { voter_id, candidate_id } = req.body || {};

  if (!Number.isInteger(voter_id) || voter_id <= 0 ||
      !Number.isInteger(candidate_id) || candidate_id <= 0) {
    const err = new Error("voter_id y candidate_id deben ser enteros positivos");
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueos para evitar carreras
    const [voters] = await conn.query(
      "SELECT id, has_voted FROM voter WHERE id = ? FOR UPDATE",
      [voter_id]
    );
    if (!voters.length) {
      const err = new Error("Votante no existe");
      err.status = 404;
      throw err;
    }
    if (voters[0].has_voted) {
      const err = new Error("El votante ya emitió su voto");
      err.status = 409;
      throw err;
    }

    const [cands] = await conn.query(
      "SELECT id FROM candidate WHERE id = ? FOR UPDATE",
      [candidate_id]
    );
    if (!cands.length) {
      const err = new Error("Candidato no existe");
      err.status = 404;
      throw err;
    }

    // Insertar voto (único por voter_id por el UNIQUE de la tabla)
    const [voteResult] = await conn.query(
      "INSERT INTO vote (voter_id, candidate_id) VALUES (?, ?)",
      [voter_id, candidate_id]
    );

    // Incrementar contador del candidato (opcional si prefieres derivar de vote)
    await conn.query(
      "UPDATE candidate SET votes = votes + 1 WHERE id = ?",
      [candidate_id]
    );

    // Marcar votante como que ya votó
    await conn.query("UPDATE voter SET has_voted = 1 WHERE id = ?", [voter_id]);

    await conn.commit();

    res.status(201).json({
      id: voteResult.insertId,
      voter_id,
      candidate_id,
      message: "Voto registrado"
    });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      const err = new Error("El votante ya emitió su único voto");
      err.status = 409;
      throw err;
    }
    throw e;
  } finally {
    conn.release();
  }
});

// GET /votes
exports.list = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT v.id,
            v.voter_id,
            voter.name      AS voter_name,
            v.candidate_id,
            candidate.name  AS candidate_name,
            v.created_at
     FROM vote v
     JOIN voter     ON voter.id = v.voter_id
     JOIN candidate ON candidate.id = v.candidate_id
     ORDER BY v.id DESC`
  );
  res.json(rows);
});

// GET /votes/:id
exports.getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  const [rows] = await pool.query(
    `SELECT v.id,
            v.voter_id,
            voter.name      AS voter_name,
            v.candidate_id,
            candidate.name  AS candidate_name,
            v.created_at
     FROM vote v
     JOIN voter     ON voter.id = v.voter_id
     JOIN candidate ON candidate.id = v.candidate_id
     WHERE v.id = ?`,
    [id]
  );
  if (!rows.length) {
    const err = new Error("Voto no encontrado");
    err.status = 404;
    throw err;
  }
  res.json(rows[0]);
});

// GET /votes/statistics
exports.statistics = asyncHandler(async (_req, res) => {
  // Totales globales
  const [[totals]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM vote)                             AS total_votes,
       (SELECT COUNT(*) FROM voter WHERE has_voted = 1)        AS total_voters_voted`
  );

  // Votos y porcentaje por candidato (incluye candidatos con 0 votos)
  const [byCandidate] = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.party,
       COUNT(v.id) AS votes,
       CASE
         WHEN t.total_votes > 0
           THEN ROUND(COUNT(v.id) / t.total_votes * 100, 2)
         ELSE 0
       END AS percentage
     FROM candidate c
     LEFT JOIN vote v ON v.candidate_id = c.id
     CROSS JOIN (SELECT COUNT(*) AS total_votes FROM vote) t
     GROUP BY c.id, c.name, c.party, t.total_votes
     ORDER BY votes DESC, c.name ASC`
  );

  res.json({
    totals,
    by_candidate: byCandidate
  });
});
