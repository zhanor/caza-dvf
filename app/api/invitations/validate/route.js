import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token manquant" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT id, email, expires_at, used_at FROM invitation_tokens WHERE token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Token invalide" }, { status: 404 });
    }

    const invitation = result.rows[0];

    if (invitation.used_at) {
      return NextResponse.json({ valid: false, error: "Lien déjà utilisé" }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Lien expiré" }, { status: 410 });
    }

    return NextResponse.json({ valid: true, email: invitation.email || null });
  } catch (error) {
    console.error("Erreur validation token:", error);
    // Vérifier si c'est une erreur de table inexistante
    if (error.message.includes('relation "invitation_tokens" does not exist')) {
      return NextResponse.json({ 
        valid: false, 
        error: "Table invitation_tokens non créée. Exécutez le script SQL sur le VPS." 
      }, { status: 500 });
    }
    return NextResponse.json({ valid: false, error: "Erreur serveur: " + error.message }, { status: 500 });
  }
}
