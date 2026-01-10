import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, name, token } = body;

    console.log("--> INSCRIPTION: Reçu pour", email);

    // --- VÉRIFICATION DU TOKEN D'INVITATION ---
    if (!token) {
      return NextResponse.json(
        { message: "Les inscriptions sont sur invitation uniquement. Veuillez utiliser un lien d'invitation valide." },
        { status: 403 }
      );
    }

    // Valider le token
    const tokenResult = await pool.query(
      `SELECT id, email as invited_email, expires_at, used_at 
       FROM invitation_tokens 
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Lien d'invitation invalide." },
        { status: 403 }
      );
    }

    const invitation = tokenResult.rows[0];

    // Vérifier si déjà utilisé
    if (invitation.used_at) {
      return NextResponse.json(
        { message: "Ce lien d'invitation a déjà été utilisé." },
        { status: 410 }
      );
    }

    // Vérifier si expiré
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { message: "Ce lien d'invitation a expiré." },
        { status: 410 }
      );
    }

    // Si un email spécifique était requis, vérifier
    if (invitation.invited_email && invitation.invited_email.toLowerCase() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { message: "Ce lien d'invitation est réservé à une autre adresse email." },
        { status: 403 }
      );
    }
    // -------------------------------------------

    if (!email || !password) {
      return NextResponse.json({ message: "Champs manquants" }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: "Cet email existe déjà" }, { status: 409 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name",
      [name || "", email.toLowerCase().trim(), hashedPassword]
    );

    const userId = newUser.rows[0].id;

    // Marquer le token comme utilisé
    await pool.query(
      "UPDATE invitation_tokens SET used_at = NOW(), used_by = $1 WHERE id = $2",
      [userId, invitation.id]
    );

    console.log("--> SUCCÈS: User créé avec l'ID", userId, "via invitation", invitation.id);

    return NextResponse.json({ message: "Succès", user: newUser.rows[0] }, { status: 201 });

  } catch (error) {
    console.error("❌ ERREUR REGISTER:", error);
    return NextResponse.json({ message: "Erreur technique: " + error.message }, { status: 500 });
  }
}
