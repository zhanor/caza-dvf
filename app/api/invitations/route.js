import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import pool from "@/lib/db";
import crypto from "crypto";

// GET - Lister les invitations (admin only)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si admin
    const adminCheck = await pool.query(
      "SELECT is_admin FROM users WHERE email = $1",
      [session.user.email]
    );
    
    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT 
        it.id, it.token, it.email, it.created_at, it.expires_at, it.used_at,
        u.name as created_by_name, u2.email as used_by_email
      FROM invitation_tokens it
      LEFT JOIN users u ON it.created_by = u.id
      LEFT JOIN users u2 ON it.used_by = u2.id
      ORDER BY it.created_at DESC LIMIT 50
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Erreur GET invitations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Créer une nouvelle invitation (admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si admin
    const adminCheck = await pool.query(
      "SELECT id, is_admin FROM users WHERE email = $1",
      [session.user.email]
    );
    
    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
    }

    const body = await req.json();
    const { email, expiresInHours = 48 } = body;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const result = await pool.query(
      `INSERT INTO invitation_tokens (token, email, created_by, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING id, token, email, created_at, expires_at`,
      [token, email || null, adminCheck.rows[0].id, expiresAt]
    );

    const invitation = result.rows[0];
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const registerLink = `${baseUrl}/register?token=${token}`;

    return NextResponse.json({
      success: true,
      invitation: { ...invitation, link: registerLink }
    }, { status: 201 });

  } catch (error) {
    console.error("Erreur POST invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une invitation (admin only)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const adminCheck = await pool.query(
      "SELECT is_admin FROM users WHERE email = $1",
      [session.user.email]
    );
    
    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await pool.query("DELETE FROM invitation_tokens WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
