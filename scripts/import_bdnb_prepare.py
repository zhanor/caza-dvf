#!/usr/bin/env python3
"""Prépare l'import BDNB (CSTB, Licence Ouverte 2.0) pour CaZa DVF.

Lit les extractions départementales téléchargées depuis https://bdnb.io/download/
(open_data_millesime_<M>_dep<DD>_csv.zip) et produit deux fichiers JSON-lines compacts,
chargés ensuite par scripts/import_bdnb_load.js :

  bdnb_batiment.jsonl  une ligne par groupe de bâtiments (année, niveaux, DPE, copropriété…)
  bdnb_parcelle.jsonl  lien parcelle cadastrale -> groupe de bâtiments

Le rattachement aux ventes DVF se fait par transactions.id_parcelle = bdnb_parcelle.parcelle_id
(jamais par id_mutation, instable d'une livraison DVF à l'autre).

Usage : python3 -I import_bdnb_prepare.py <dossier_sortie> <zip_dep06> <zip_dep83> ...
"""
import csv
import io
import json
import sys
import zipfile

csv.field_size_limit(1 << 30)


def lire(z, table):
    f = io.TextIOWrapper(z.open('csv/%s.csv' % table), encoding='utf-8', newline='')
    return csv.DictReader(f, delimiter=';')


def entier(v):
    try:
        return int(float(v)) if v not in (None, '') else None
    except ValueError:
        return None


def nombre(v):
    try:
        return float(v) if v not in (None, '') else None
    except ValueError:
        return None


def texte(v):
    return v if v not in (None, '') else None


def main():
    sortie, zips = sys.argv[1], sys.argv[2:]
    nb_bat = nb_rel = 0
    with open(sortie + '/bdnb_batiment.jsonl', 'w', encoding='utf-8') as fb, \
            open(sortie + '/bdnb_parcelle.jsonl', 'w', encoding='utf-8') as fp:
        for chemin in zips:
            z = zipfile.ZipFile(chemin)
            millesime = next(lire(z, 'metadonnees_bdnb_version'))['millesime']
            bat = {}

            def fiche(r):
                return bat.setdefault(r['batiment_groupe_id'], {
                    'batiment_groupe_id': r['batiment_groupe_id'],
                    'code_departement': r['code_departement_insee'],
                    'millesime': millesime,
                })

            for r in lire(z, 'batiment_groupe'):
                b = fiche(r)
                b['code_commune'] = texte(r['code_commune_insee'])
            for r in lire(z, 'batiment_groupe_ffo_bat'):
                b = fiche(r)
                b['annee_construction'] = entier(r['annee_construction'])
                b['nb_niveau'] = entier(r['nb_niveau'])
                b['nb_log'] = entier(r['nb_log'])
                b['usage_niveau_1'] = texte(r['usage_niveau_1_txt'])
                b['mat_mur'] = texte(r['mat_mur_txt'])
                b['mat_toit'] = texte(r['mat_toit_txt'])
            for r in lire(z, 'batiment_groupe_synthese_propriete_usage'):
                fiche(r)['usage_principal'] = texte(r['usage_principal_bdnb_open'])
            for r in lire(z, 'batiment_groupe_bdtopo_bat'):
                fiche(r)['hauteur_mean'] = nombre(r['hauteur_mean'])
            for r in lire(z, 'batiment_groupe_dpe_representatif_logement'):
                b = fiche(r)
                b['dpe_classe'] = texte(r['classe_bilan_dpe'])
                b['dpe_classe_ges'] = texte(r['classe_emission_ges'])
                b['dpe_date'] = texte((r['date_etablissement_dpe'] or '')[:10])
                b['dpe_type'] = texte(r['type_dpe'])
                b['dpe_identifiant'] = texte(r['identifiant_dpe'])
                b['dpe_annee_construction'] = entier(r['annee_construction_dpe'])
            for r in lire(z, 'batiment_groupe_rnc'):
                b = fiche(r)
                b['copro_immat'] = texte(r['numero_immat_principal'])
                b['copro_nb_lot_tot'] = entier(r['nb_lot_tot'])
                b['copro_nb_log'] = entier(r['nb_log'])
                b['copro_periode_construction'] = texte(r['periode_construction_max'])

            for b in bat.values():
                fb.write(json.dumps(b, ensure_ascii=False) + '\n')
                nb_bat += 1
            for r in lire(z, 'rel_batiment_groupe_parcelle'):
                if not r['parcelle_id']:
                    continue
                fp.write(json.dumps({
                    'parcelle_id': r['parcelle_id'],
                    'batiment_groupe_id': r['batiment_groupe_id'],
                    'parcelle_principale': str(r['parcelle_principale']).lower() in ('1', 't', 'true'),
                }) + '\n')
                nb_rel += 1
            print(chemin, 'millésime', millesime, 'bâtiments cumulés', nb_bat, 'liens cumulés', nb_rel)


if __name__ == '__main__':
    main()
