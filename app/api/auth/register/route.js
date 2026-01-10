import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Fonction helper pour hasher les mots de passe
async function hashPassword(password) {
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default || bcryptModule;
  return bcrypt.hash(password, 10);
}

export async function POST(req) {
  // --- BLOCAGE DES INSCRIPTIONS ---
  const INSCRIPTIONS_OUVERTES = false; 

  if (!INSCRIPTIONS_OUVERTES) {
    return NextResponse.json(
      { message: "Les inscriptions sont fermées pour le moment." },
      { status: 403 }
    );
  }
  // -------------------------------

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
    const hashedPassword = await hashPassword(password);

    // 3. Insertion
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name",
      [name || "", email.toLowerCase().trim(), hashedPassword]
    );

    console.log("--> SUCCÈS: User créé avec l'ID", newUser.rows[0].id);

    return NextResponse.json({ message: "Succès", user: newUser.rows[0] }, { status: 201 });

  } catch (error) {
    console.error("❌ ERREUR REGISTER:", error);
    return NextResponse.json({ message: "Erreur technique: " + error.message }, { status: 500 });
  }
}
