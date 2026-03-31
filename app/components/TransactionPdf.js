import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from '@react-pdf/renderer';
import { actualiserPrixICC, needsActualization, ICC_LATEST } from '../../lib/icc';

// Enregistrement Roboto pour supporter le signe € (Unicode)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
  ],
});

// Palette couleurs
const BLUE        = '#2563EB';
const BLUE_LIGHT  = '#EFF6FF';
const BLUE_MID    = '#DBEAFE';
const ORANGE      = '#C2410C';
const ORANGE_LIGHT= '#FFF7ED';
const ORANGE_MID  = '#FFEDD5';
const GRAY_DARK   = '#111827';
const GRAY_MID    = '#374151';
const GRAY_LIGHT  = '#6B7280';
const GRAY_BG     = '#F9FAFB';
const BORDER      = '#E5E7EB';
const WHITE       = '#FFFFFF';
const GREEN       = '#059669';
const GREEN_LIGHT = '#ECFDF5';
const GREEN_MID   = '#A7F3D0';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: WHITE,
    paddingTop: 28,
    paddingBottom: 38,
    paddingHorizontal: 24,
    fontSize: 8,
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
    fontWeight: 'bold',
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
  synthèseCardOrange: {
    flex: 1,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: ORANGE_MID,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  synthèseLabel: {
    fontSize: 6.5,
    color: BLUE,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  synthèseLabelOrange: {
    fontSize: 6.5,
    color: ORANGE,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  synthèseValue: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: BLUE,
  },
  synthèseValueOrange: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: ORANGE,
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
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    minWidth: 60,
  },
  adresseValue: {
    fontSize: 9,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: GRAY_DARK,
    flex: 1,
  },

  // ── Section title ─────────────────────────────────────
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
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
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderColor: BORDER,
    alignItems: 'flex-start',
  },
  tableRowEven: { backgroundColor: GRAY_BG },
  tableRowOdd:  { backgroundColor: WHITE },
  tableRowICC:  { backgroundColor: '#FFFBF5' },

  // Cellules — portrait A4 ≈ 537pt (595 - 2×24 - 2×5 padding)
  // Ref:18, Date:44, Type:48, Cad:50, Addr:flex, Surf:36, Prix:54, €/m²:52, PrixAct:54, €/m²Act:52, Dist:36
  cRef:       { width: 18,  color: WHITE,     fontSize: 7.5, textAlign: 'center' },
  cDate:      { width: 44,  color: GRAY_MID,  fontSize: 7.5 },
  cType:      { width: 48,  color: GRAY_MID,  fontSize: 7.5 },
  cCadastre:  { width: 50,  color: GRAY_MID,  fontSize: 7.5 },
  cAddress:   { flex: 1,    color: GRAY_DARK, fontSize: 7.5 },
  cSurf:      { width: 36,  color: GRAY_MID,  fontSize: 7.5, textAlign: 'right' },
  cPrice:     { width: 56,  color: GRAY_DARK, fontSize: 7.5, textAlign: 'right', fontFamily: 'Roboto', fontWeight: 'bold' },
  cPriceM2:   { width: 54,  color: BLUE,      fontSize: 7.5, textAlign: 'right', fontFamily: 'Roboto', fontWeight: 'bold' },
  cPriceAct:  { width: 56,  fontSize: 7.5,    textAlign: 'right' },
  cPriceM2Act:{ width: 54,  fontSize: 7.5,    textAlign: 'right' },
  cDist:      { width: 38,  color: GRAY_LIGHT, fontSize: 7.5, textAlign: 'right' },

  headerCell: {
    color: WHITE,
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerCellOrange: {
    color: '#FFD4A8',
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Valeurs ICC dans les cellules
  iccValue: {
    color: ORANGE,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    fontSize: 7.5,
  },
  iccSub: {
    color: '#9A3412',
    fontSize: 6,
    marginTop: 1,
  },
  iccDash: {
    color: GRAY_LIGHT,
    fontSize: 7.5,
  },

  // ── Carte vectorielle ─────────────────────────────────
  mapContainer: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mapTitle: {
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: GRAY_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: GRAY_BG,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  mapBody: {
    backgroundColor: '#EFF6FF',
    position: 'relative',
    height: 160,
  },
  mapImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
  },
  mapMarker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5pt solid white',
  },
  mapMarkerText: {
    color: WHITE,
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  mapCenter: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D4ED8',
    border: '2pt solid white',
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mapLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapLegendText: {
    fontSize: 6,
    color: GRAY_LIGHT,
  },

  // ── Note méthodologie ICC ──────────────────────────────
  iccNote: {
    marginTop: 10,
    backgroundColor: ORANGE_LIGHT,
    borderWidth: 1,
    borderColor: ORANGE_MID,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  iccNoteTitle: {
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  iccNoteText: {
    fontSize: 6.5,
    color: GRAY_MID,
    lineHeight: 1.4,
  },

  // ── Section urbanisme ─────────────────────────────────
  urbanismeBlock: {
    marginTop: 10,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: GREEN_MID,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  urbanismeTitle: {
    fontSize: 6.5,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  urbanismeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 2,
  },
  urbanismeLabel: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    width: 60,
  },
  urbanismeValue: {
    fontSize: 7,
    color: GRAY_DARK,
    flex: 1,
  },
  urbanismeLink: {
    fontSize: 6.5,
    color: GREEN,
    flex: 1,
    textDecoration: 'underline',
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
const TYPE_COLORS_PDF = {
  Maison:      '#10B981',
  Appartement: '#3B82F6',
  Local:       '#8B5CF6',
  Terrain:     '#F59E0B',
};
function getPdfTypeColor(type) {
  if (!type) return '#6B7280';
  for (const [k, v] of Object.entries(TYPE_COLORS_PDF)) {
    if (type.includes(k)) return v;
  }
  return '#6B7280';
}

const TransactionPdf = ({ transactions = [], searchedAddress = '', avgPriceM2 = 0, avgPriceM2ICC = 0, searchCenter = null, mapImageUrl = null, urbanismeData = null }) => {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const avgFormatted    = avgPriceM2 > 0    ? `${fmt(Math.round(avgPriceM2))} €/m²`    : 'N/A';
  const avgICCFormatted = avgPriceM2ICC > 0 ? `${fmt(Math.round(avgPriceM2ICC))} €/m²` : 'N/A';

  const hasAnyICC = transactions.some(
    (t) => t.dateRaw && needsActualization(t.dateRaw)
  );

  // ── Carte vectorielle ──
  const MAP_W = 495, MAP_H = 160, PAD = 18;
  const coordTxs = transactions.filter(t => t.lat && t.lng);
  const allLats = coordTxs.map(t => t.lat);
  const allLngs = coordTxs.map(t => t.lng);
  if (searchCenter) { allLats.push(searchCenter.lat); allLngs.push(searchCenter.lon); }
  const minLat = allLats.length ? Math.min(...allLats) : 0;
  const maxLat = allLats.length ? Math.max(...allLats) : 1;
  const minLng = allLngs.length ? Math.min(...allLngs) : 0;
  const maxLng = allLngs.length ? Math.max(...allLngs) : 1;
  const latRange = (maxLat - minLat) || 0.001;
  const lngRange = (maxLng - minLng) || 0.001;
  const toX = (lng) => PAD + ((lng - minLng) / lngRange) * (MAP_W - 2 * PAD);
  const toY = (lat) => PAD + ((1 - (lat - minLat) / latRange)) * (MAP_H - 2 * PAD);
  const showMap = coordTxs.length > 0;

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
          <Text style={styles.headerTitle}>Rapport d'Evaluation DVF</Text>
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

        {/* ── Synthèse (3 cartes) ── */}
        <View style={styles.synthèseRow}>
          <View style={styles.synthèseCard}>
            <Text style={styles.synthèseLabel}>Moyenne m² brute</Text>
            <Text style={styles.synthèseValue}>{avgFormatted}</Text>
            <Text style={styles.synthèseNote}>
              Prix de vente au jour de la transaction
            </Text>
          </View>
          {hasAnyICC && (
            <View style={styles.synthèseCardOrange}>
              <Text style={styles.synthèseLabelOrange}>Moyenne m² act. ICC</Text>
              <Text style={styles.synthèseValueOrange}>{avgICCFormatted}</Text>
              <Text style={styles.synthèseNote}>
                Actualisée indice ICC {ICC_LATEST.quarter}
              </Text>
            </View>
          )}
          <View style={styles.synthèseCard}>
            <Text style={styles.synthèseLabel}>Références retenues</Text>
            <Text style={styles.synthèseValue}>{transactions.length}</Text>
            <Text style={styles.synthèseNote}>
              Transactions après filtrage
            </Text>
          </View>
        </View>

        {/* ── Carte ── */}
        {showMap && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>Localisation des références sélectionnées</Text>
            {mapImageUrl ? (
              /* Capture réelle de la carte Leaflet */
              <Image src={mapImageUrl} style={styles.mapImage} />
            ) : (
              /* Fallback vectoriel si capture non disponible */
              <View style={[styles.mapBody, { width: MAP_W, height: MAP_H }]}>
                {[0.25, 0.5, 0.75].map(f => (
                  <View key={`h${f}`} style={{ position: 'absolute', left: 0, right: 0, top: PAD + f * (MAP_H - 2 * PAD), height: 0.5, backgroundColor: '#BFDBFE' }} />
                ))}
                {[0.25, 0.5, 0.75].map(f => (
                  <View key={`v${f}`} style={{ position: 'absolute', top: 0, bottom: 0, left: PAD + f * (MAP_W - 2 * PAD), width: 0.5, backgroundColor: '#BFDBFE' }} />
                ))}
                {searchCenter && (
                  <View style={[styles.mapCenter, { left: toX(searchCenter.lon) - 5, top: toY(searchCenter.lat) - 5 }]} />
                )}
                {coordTxs.map(t => {
                  const cx = toX(t.lng) - 9;
                  const cy = toY(t.lat) - 9;
                  return (
                    <View key={t.id} style={[styles.mapMarker, { left: cx, top: cy, backgroundColor: getPdfTypeColor(t.type) }]}>
                      <Text style={styles.mapMarkerText}>{t.refNum}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {/* Légende types */}
            <View style={styles.mapLegend}>
              {Object.entries(TYPE_COLORS_PDF).map(([label, color]) => (
                <View key={label} style={styles.mapLegendItem}>
                  <View style={[styles.mapLegendDot, { backgroundColor: color }]} />
                  <Text style={styles.mapLegendText}>{label}</Text>
                </View>
              ))}
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: '#1D4ED8' }]} />
                <Text style={styles.mapLegendText}>Point de recherche</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Titre section tableau ── */}
        <Text style={styles.sectionTitle}>
          Liste des références sélectionnées
        </Text>

        {/* ── Tableau ── */}
        <View style={styles.tableContainer}>
          {/* En-tête */}
          <View style={styles.tableHeader}>
            <Text style={[styles.cRef,        styles.headerCell]}>#</Text>
            <Text style={[styles.cDate,       styles.headerCell]}>Date</Text>
            <Text style={[styles.cType,       styles.headerCell]}>Type</Text>
            <Text style={[styles.cCadastre,   styles.headerCell]}>Cadastre</Text>
            <Text style={[styles.cAddress,    styles.headerCell]}>Adresse</Text>
            <Text style={[styles.cSurf,       styles.headerCell]}>Surf.</Text>
            <Text style={[styles.cPrice,      styles.headerCell]}>Prix vente</Text>
            <Text style={[styles.cPriceM2,    styles.headerCell]}>€/m²</Text>
            <Text style={[styles.cPriceAct,   styles.headerCellOrange]}>Act. ICC</Text>
            <Text style={[styles.cPriceM2Act, styles.headerCellOrange]}>€/m² Act.</Text>
            <Text style={[styles.cDist,       styles.headerCell]}>Dist.</Text>
          </View>

          {/* Lignes */}
          {transactions.map((t, i) => {
            const isTerrain = t.type?.includes('Terrain');
            const surfaceRef = isTerrain ? t.terrain : t.surface;
            const shouldActualize = t.dateRaw && needsActualization(t.dateRaw);
            const icc = shouldActualize ? actualiserPrixICC(t.price, t.dateRaw) : null;
            const iccPricePerSqm = icc && surfaceRef > 0 ? Math.round(icc.prixActualise / surfaceRef) : 0;

            const rowStyle = icc ? styles.tableRowICC : (i % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven);

            return (
              <View key={t.id || i} style={[styles.tableRow, rowStyle]}>
                <View style={[styles.cRef, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: getPdfTypeColor(t.type), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: WHITE, fontSize: 6.5, fontFamily: 'Roboto', fontWeight: 'bold', lineHeight: 1 }}>{t.refNum || i + 1}</Text>
                  </View>
                </View>
                <Text style={styles.cDate}>{fmtDate(t.date)}</Text>
                <Text style={styles.cType}>{t.type || '-'}</Text>
                <Text style={styles.cCadastre}>{t.cadastre || '-'}</Text>
                <Text style={styles.cAddress}>{t.address || '-'}</Text>
                <View style={styles.cSurf}>
                  <Text>{t.surface > 0 ? `${fmt(t.surface)} m²` : '-'}</Text>
                  {t.type?.includes('Maison') && t.terrain > 0 && (
                    <Text style={{ fontSize: 6, color: GRAY_LIGHT, marginTop: 1 }}>
                      {`${fmt(t.terrain)} m² ter.`}
                    </Text>
                  )}
                </View>
                <Text style={styles.cPrice}>{fmtEur(t.price)}</Text>
                <Text style={styles.cPriceM2}>{priceM2(t.price, surfaceRef)}</Text>

                {/* Prix actualisé ICC */}
                <View style={styles.cPriceAct}>
                  {icc ? (
                    <>
                      <Text style={styles.iccValue}>{fmtEur(icc.prixActualise)}</Text>
                      <Text style={styles.iccSub}>
                        x{icc.coefficient} ({icc.quarterVente})
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.iccDash}>—</Text>
                  )}
                </View>

                {/* €/m² actualisé ICC */}
                <View style={styles.cPriceM2Act}>
                  {icc && iccPricePerSqm > 0 ? (
                    <>
                      <Text style={styles.iccValue}>{fmt(iccPricePerSqm)} €/m²</Text>
                      <Text style={styles.iccSub}>
                        ICC {icc.iccVente}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.iccDash}>—</Text>
                  )}
                </View>

                <Text style={styles.cDist}>
                  {t.distance > 0 ? `${fmt(t.distance)} m` : '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Note méthodologie ICC ── */}
        {hasAnyICC && (
          <View style={styles.iccNote}>
            <Text style={styles.iccNoteTitle}>
              Méthodologie — Actualisation par l'Indice du Cout de la Construction (ICC)
            </Text>
            <Text style={styles.iccNoteText}>
              Formule : Prix actualisé = Prix de vente × (ICC {ICC_LATEST.quarter} / ICC trimestre de vente){'\n'}
              Dernier indice connu : ICC {ICC_LATEST.quarter} = {ICC_LATEST.value} — Source : INSEE{'\n'}
              Les transactions de plus de 2 ans font l'objet d'une actualisation. Le coefficient affiché est arrondi à 3 décimales.
            </Text>
          </View>
        )}

        {/* ── Urbanisme PLU ── */}
        {urbanismeData?.zone && (
          <View style={styles.urbanismeBlock}>
            <Text style={styles.urbanismeTitle}>Urbanisme — Plan Local d'Urbanisme (PLU)</Text>
            <View style={styles.urbanismeRow}>
              <Text style={styles.urbanismeLabel}>Zone :</Text>
              <Text style={styles.urbanismeValue}>{urbanismeData.zone}</Text>
            </View>
            {urbanismeData.urlReglementPdf && (
              <View style={styles.urbanismeRow}>
                <Text style={styles.urbanismeLabel}>Règlement :</Text>
                <Link src={urbanismeData.urlReglementPdf} style={styles.urbanismeLink}>
                  {urbanismeData.urlReglementPdf}
                </Link>
              </View>
            )}
          </View>
        )}

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
