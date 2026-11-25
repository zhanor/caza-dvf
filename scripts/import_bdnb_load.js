#!/usr/bin/env node
/**
 * Charge la BDNB (CSTB, Licence Ouverte 2.0) préparée par import_bdnb_prepare.py.
 *
 * Deux tables, séparées de `transactions` (un réimport DVF ne les touche pas) :
 *   bdnb_batiment  une ligne par groupe de bâtiments
 *   bdnb_parcelle  parcelle cadastrale -> groupe de bâtiments
 * Rattachement : transactions.id_parcelle = bdnb_parcelle.parcelle_id.
 *
 * Le chargement se fait dans des tables *_import, basculées en une seule transaction :
 * aucune session ne voit de table vide ou à moitié remplie.
 *
 * Usage : node scripts/import_bdnb_load.js <dossier contenant les .jsonl>
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=["']?([^"'\n]+)/m) || [])[1];
const dossier = process.argv[2];
if (!url || !dossier) {
  console.error('Usage : node scripts/import_bdnb_load.js <dossier jsonl> (DATABASE_URL dans .env)');
  process.exit(1);
}

const DDL = `
DROP TABLE IF EXISTS bdnb_batiment_import;
DROP TABLE IF EXISTS bdnb_parcelle_import;
CREATE TABLE bdnb_batiment_import (
  batiment_groupe_id text PRIMARY KEY,
  code_departement text,
  code_commune text,
  millesime text,
  annee_construction integer,
  nb_niveau integer,
  nb_log integer,
  usage_niveau_1 text,
  usage_principal text,
  mat_mur text,
  mat_toit text,
  hauteur_mean numeric,
  dpe_classe text,
  dpe_classe_ges text,
  dpe_date date,
  dpe_type text,
  dpe_identifiant text,
  dpe_annee_construction integer,
  copro_immat text,
  copro_nb_lot_tot integer,
  copro_nb_log integer,
  copro_periode_construction text
);
CREATE TABLE bdnb_parcelle_import (
  parcelle_id text NOT NULL,
  batiment_groupe_id text NOT NULL,
  parcelle_principale boolean,
  PRIMARY KEY (parcelle_id, batiment_groupe_id)
);`;

async function charger(client, fichier, table) {
  const rl = readline.createInterface({ input: fs.createReadStream(fichier), crlfDelay: Infinity });
  let lot = [];
  let total = 0;
  const vider = async () => {
    if (!lot.length) return;
    await client.query(
      `INSERT INTO ${table} SELECT * FROM json_populate_recordset(null::${table}, $1::json) ON CONFLICT DO NOTHING`,
      ['[' + lot.join(',') + ']']
    );
    total += lot.length;
    lot = [];
  };
  for await (const ligne of rl) {
    if (!ligne) continue;
    lot.push(ligne);
    if (lot.length >= 5000) await vider();
  }
  await vider();
  return total;
}

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(DDL);
    const nb = await charger(client, path.join(dossier, 'bdnb_batiment.jsonl'), 'bdnb_batiment_import');
    const np = await charger(client, path.join(dossier, 'bdnb_parcelle.jsonl'), 'bdnb_parcelle_import');
    console.log('lignes lues', { batiments: nb, liens: np });
    await client.query('ANALYZE bdnb_batiment_import; ANALYZE bdnb_parcelle_import;');
    await client.query(`
      BEGIN;
      DROP TABLE IF EXISTS bdnb_batiment;
      DROP TABLE IF EXISTS bdnb_parcelle;
      ALTER TABLE bdnb_batiment_import RENAME TO bdnb_batiment;
      ALTER TABLE bdnb_parcelle_import RENAME TO bdnb_parcelle;
      ALTER INDEX bdnb_batiment_import_pkey RENAME TO bdnb_batiment_pkey;
      ALTER INDEX bdnb_parcelle_import_pkey RENAME TO bdnb_parcelle_pkey;
      COMMIT;`);
    const r = await client.query(
      "SELECT (SELECT count(*) FROM bdnb_batiment) AS batiments, (SELECT count(*) FROM bdnb_parcelle) AS liens, pg_size_pretty(pg_total_relation_size('bdnb_batiment') + pg_total_relation_size('bdnb_parcelle')) AS taille"
    );
    console.log('en base', r.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
