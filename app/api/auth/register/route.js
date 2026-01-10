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

    if (!tokenResult.rows || tokenResult.rows.length === 0 || !tokenResult.rows[0]) {
      return NextResponse.json(
        { message: "Lien d'invitation invalide." },
        { status: 403 }
      );
    }

    const invitation = tokenResult.rows[0];

    // Validation préliminaire (avant transaction, mais sera revérifié dans la transaction)
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

    if (!email || !password) {
      return NextResponse.json({ message: "Champs manquants" }, { status: 400 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Utiliser une transaction pour garantir l'atomicité et éviter les race conditions
    let client = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // RE-VÉRIFIER le token dans la transaction avec un verrou (SELECT FOR UPDATE)
      // pour éviter la race condition : deux requêtes simultanées ne peuvent pas toutes deux
      // voir le token comme non utilisé
      const tokenCheck = await client.query(
        `SELECT id, used_at, expires_at FROM invitation_tokens WHERE id = $1 FOR UPDATE`,
        [invitation.id]
      );

      if (tokenCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { message: "Lien d'invitation invalide." },
          { status: 403 }
        );
      }

      const lockedInvitation = tokenCheck.rows[0];

      // Vérifier si déjà utilisé (dans la transaction après verrou)
      if (lockedInvitation.used_at) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { message: "Ce lien d'invitation a déjà été utilisé." },
          { status: 410 }
        );
      }

      // Vérifier si expiré (re-vérification dans la transaction)
      if (new Date(lockedInvitation.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { message: "Ce lien d'invitation a expiré." },
          { status: 410 }
        );
      }

      // Vérifier si l'email existe déjà (dans la transaction pour éviter race condition)
      const existing = await client.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: "Cet email existe déjà" }, { status: 409 });
      }

      // Créer l'utilisateur
      const newUser = await client.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name",
        [name || "", email.toLowerCase().trim(), hashedPassword]
      );

      if (!newUser.rows || newUser.rows.length === 0 || !newUser.rows[0] || !newUser.rows[0].id) {
        throw new Error('Failed to create user - no user data returned');
      }

      const userId = newUser.rows[0].id;

      // Marquer le token comme utilisé dans la même transaction (avec vérification)
      // Le WHERE clause vérifie que used_at est NULL pour éviter les mises à jour multiples
      // Utiliser lockedInvitation.id pour garantir la cohérence avec le token verrouillé
      const updateResult = await client.query(
        "UPDATE invitation_tokens SET used_at = NOW(), used_by = $1 WHERE id = $2 AND used_at IS NULL RETURNING id",
        [userId, lockedInvitation.id]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Token update failed - token may have been already used by another request');
      }

      await client.query('COMMIT');

      console.log("--> SUCCÈS: User créé avec l'ID", userId, "via invitation", lockedInvitation.id);
      
      return NextResponse.json({ message: "Succès", user: newUser.rows[0] }, { status: 201 });
    } catch (error) {
      // Rollback seulement si la transaction a été commencée
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // Ignorer erreur de rollback, mais la logger
          console.error('Erreur lors du ROLLBACK:', rollbackError);
        }
      }
      throw error;
    } finally {
      // Libérer la connexion seulement si elle a été acquise
      if (client) {
        client.release();
      }
    }

  } catch (error) {
    console.error("❌ ERREUR REGISTER:", error);
    return NextResponse.json({ message: "Erreur technique: " + error.message }, { status: 500 });
  }
}
