import { NextResponse } from "next/server";
import pool from "@/lib/db";
const bcrypt = require("bcryptjs");

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    console.log("--> INSCRIPTION: Reçu pour", email);

    if (!email || !password) {
      return NextResponse.json({ message: "Champs manquants" }, { status: 400 });
    }

    // 1. Vérif existence
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: "Cet email existe déjà" }, { status: 409 });
    }

    // 2. Hashage
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insertion
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name",
      [name || "", email.toLowerCase().trim(), hashedPassword]
    );

    console.log("--> SUCCÈS: User créé avec l'ID", newUser.rows[0].id);

    return NextResponse.json({ message: "Succès", user: newUser.rows[0] }, { status: 201 });

  } catch (error) {
    console.error("❌ ERREUR REGISTER:", error); // C'est ça qu'on veut voir dans les logs
    return NextResponse.json({ message: "Erreur technique: " + error.message }, { status: 500 });
  }
}
