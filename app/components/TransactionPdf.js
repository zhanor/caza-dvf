import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Palette couleurs
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const BLUE_MID = '#DBEAFE';
const GRAY_DARK = '#111827';
const GRAY_MID = '#374151';
const GRAY_LIGHT = '#6B7280';
const GRAY_BG = '#F9FAFB';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: WHITE,
    paddingTop: 28,
    paddingBottom: 38,
    paddingHorizontal: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  // ── En-tête ──────────────────────────────────────────
  headerBand: {
    backgroundColor: BLUE,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#BFDBFE',
    marginTop: 3,
  },

  // ── Bloc synthèse ─────────────────────────────────────
  synthèseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  synthèseCard: {
    flex: 1,
    backgroundColor: BLUE_LIGHT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BLUE_MID,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  synthèseLabel: {
    fontSize: 6.5,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  synthèseValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  synthèseNote: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    marginTop: 2,
  },

  // Bloc adresse
  adresseCard: {
    backgroundColor: GRAY_BG,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adresseLabel: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    minWidth: 60,
  },
  adresseValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_DARK,
    flex: 1,
  },

  // ── Section title ─────────────────────────────────────
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // ── Tableau ───────────────────────────────────────────
  tableContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GRAY_MID,
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderTopWidth: 1,
    borderColor: BORDER,
    alignItems: 'flex-start',
  },
  tableRowEven: { backgroundColor: GRAY_BG },
  tableRowOdd:  { backgroundColor: WHITE },

  // Cellules — portrait A4 ≈ 547pt disponibles (595 - 2×24)
  // 44+46+48+flex+42+62+62+48 = 352 fixe, reste flex pour adresse
  cDate:     { width: 44,  color: GRAY_MID,   fontSize: 7.5 },
  cType:     { width: 46,  color: GRAY_MID,   fontSize: 7.5 },
  cCadastre: { width: 52,  color: GRAY_MID,   fontSize: 7.5 },
  cAddress:  { flex: 1,    color: GRAY_DARK,  fontSize: 7.5 },
  cSurf:     { width: 40,  color: GRAY_MID,   fontSize: 7.5, textAlign: 'right' },
  cPrice:    { width: 62,  color: GRAY_DARK,  fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  cPriceM2:  { width: 62,  color: BLUE,       fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  cDist:     { width: 42,  color: GRAY_LIGHT, fontSize: 7.5, textAlign: 'right' },

  headerCell: {
    color: WHITE,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ── Pied de page ──────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText:  { fontSize: 6.5, color: GRAY_LIGHT },
  footerBrand: { fontSize: 6.5, color: BLUE, fontFamily: 'Helvetica-Bold' },
});

// ── Utilitaires ────────────────────────────────────────
const fmt = (n) => {
  if (!n) return '-';
  return new Intl.NumberFormat('fr-FR').format(n).replace(/[\u00A0\u202F]/g, ' ');
};

const fmtEur = (n) => {
  if (!n) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n).replace(/[\u00A0\u202F]/g, ' ');
};

const fmtDate = (dateStr) => dateStr || '-';

const priceM2 = (price, surface) => {
  if (!surface || surface === 0) return '-';
  return `${fmt(Math.round(price / surface))} €/m²`;
};

// ── Composant principal ────────────────────────────────
const TransactionPdf = ({ transactions = [], searchedAddress = '', avgPriceM2 = 0 }) => {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const avgFormatted = avgPriceM2 > 0 ? `${fmt(Math.round(avgPriceM2))} €/m²` : 'N/A';

  return (
    <Document
      title={`Rapport DVF - ${searchedAddress}`}
      author="CaZa DVF"
      subject="Rapport d'évaluation immobilière DVF"
      keywords="DVF, immobilier, évaluation, cadastre"
    >
      <Page size="A4" orientation="portrait" style={styles.page}>

        {/* ── En-tête bleu ── */}
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>Rapport d'Évaluation DVF</Text>
          <Text style={styles.headerSubtitle}>
            CaZa DVF · Données Valeurs Foncières · Généré le {today}
          </Text>
        </View>

        {/* ── Adresse du bien évalué ── */}
        <View style={styles.adresseCard}>
          <Text style={styles.adresseLabel}>Bien évalué</Text>
          <Text style={styles.adresseValue}>
            {searchedAddress || 'Adresse non renseignée'}
          </Text>
        </View>

        {/* ── Synthèse (2 cartes) ── */}
        <View style={styles.synthèseRow}>
          <View style={styles.synthèseCard}>
            <Text style={styles.synthèseLabel}>Moyenne m² retenue</Text>
            <Text style={styles.synthèseValue}>{avgFormatted}</Text>
            <Text style={styles.synthèseNote}>
              Calculée sur {transactions.length} référence{transactions.length > 1 ? 's' : ''} sélectionnée{transactions.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.synthèseCard}>
            <Text style={styles.synthèseLabel}>Références retenues</Text>
            <Text style={styles.synthèseValue}>{transactions.length}</Text>
            <Text style={styles.synthèseNote}>
              Transactions après filtrage
            </Text>
          </View>
        </View>

        {/* ── Titre section tableau ── */}
        <Text style={styles.sectionTitle}>
          Liste des références sélectionnées
        </Text>

        {/* ── Tableau ── */}
        <View style={styles.tableContainer}>
          {/* En-tête */}
          <View style={styles.tableHeader}>
            <Text style={[styles.cDate,     styles.headerCell]}>Date</Text>
            <Text style={[styles.cType,     styles.headerCell]}>Type</Text>
            <Text style={[styles.cCadastre, styles.headerCell]}>Cadastre</Text>
            <Text style={[styles.cAddress,  styles.headerCell]}>Adresse</Text>
            <Text style={[styles.cSurf,     styles.headerCell]}>Surf.</Text>
            <Text style={[styles.cPrice,    styles.headerCell]}>Prix</Text>
            <Text style={[styles.cPriceM2,  styles.headerCell]}>Prix/m²</Text>
            <Text style={[styles.cDist,     styles.headerCell]}>Dist.</Text>
          </View>

          {/* Lignes */}
          {transactions.map((t, i) => (
            <View
              key={t.id || i}
              style={[styles.tableRow, i % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven]}
            >
              <Text style={styles.cDate}>{fmtDate(t.date)}</Text>
              <Text style={styles.cType}>{t.type || '-'}</Text>
              <Text style={styles.cCadastre}>{t.cadastre || '-'}</Text>
              <Text style={styles.cAddress}>{t.address || '-'}</Text>
              <Text style={styles.cSurf}>
                {t.surface > 0 ? `${fmt(t.surface)} m²` : '-'}
              </Text>
              <Text style={styles.cPrice}>{fmtEur(t.price)}</Text>
              <Text style={styles.cPriceM2}>{priceM2(t.price, t.surface)}</Text>
              <Text style={styles.cDist}>
                {t.distance > 0 ? `${fmt(t.distance)} m` : '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Pied de page ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Source : Données Valeurs Foncières (DVF) — data.gouv.fr
          </Text>
          <Text style={styles.footerBrand}>CaZa DVF</Text>
        </View>

      </Page>
    </Document>
  );
};

export default TransactionPdf;
