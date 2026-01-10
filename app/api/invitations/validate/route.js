import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET - Valider un token d'invitation
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token manquant" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, email, expires_at, used_at 
       FROM invitation_tokens 
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Token invalide" }, { status: 404 });
    }

    const invitation = result.rows[0];

    // Vérifier si déjà utilisé
    if (invitation.used_at) {
      return NextResponse.json({ valid: false, error: "Ce lien a déjà été utilisé" }, { status: 410 });
    }

    // Vérifier si expiré
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Ce lien a expiré" }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email || null  // Email pré-rempli si fourni
    });

  } catch (error) {
    console.error("Erreur validation token:", error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
