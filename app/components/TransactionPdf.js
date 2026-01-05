import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  tableContainer: {
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#bff0fd',
    alignItems: 'center',
    height: 24,
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#bff0fd',
    alignItems: 'center',
    height: 24,
  },
  rowEven: {
    backgroundColor: '#F9FAFB',
  },
  // Cellules avec largeurs fixes en pourcentage
  cellDate: {
    flexBasis: '10%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'left',
  },
  cellType: {
    flexBasis: '10%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'left',
  },
  cellAddress: {
    flexBasis: '25%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'left',
  },
  cellCadastre: {
    flexBasis: '10%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'left',
    fontFamily: 'Courier',
  },
  cellSurfaceHab: {
    flexBasis: '8%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'right',
  },
  cellSurfaceTer: {
    flexBasis: '8%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'right',
  },
  cellPrice: {
    flexBasis: '10%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  cellPriceM2: {
    flexBasis: '10%',
    color: '#2563EB',
    fontSize: 9,
    textAlign: 'right',
  },
  cellDistance: {
    flexBasis: '9%',
    color: '#111827',
    fontSize: 9,
    textAlign: 'right',
  },
  // Styles pour les en-têtes
  headerCell: {
    color: '#374151',
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  headerCellLeft: {
    color: '#374151',
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  headerCellRight: {
    color: '#374151',
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 15,
  },
});

// Fonctions utilitaires pour formater les nombres (remplace les espaces insécables par des espaces simples)
const formatCurrency = (amount) => {
  if (!amount) return '-';
  // On formate en FR puis on remplace tous les types d'espaces (insécables, fins, etc.) par un espace simple
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR', 
    maximumFractionDigits: 0 
  }).format(amount).replace(/[\u00A0\u202F\s]/g, ' '); 
};

const formatNumber = (num) => {
  if (!num) return '-';
  return new Intl.NumberFormat('fr-FR').format(num).replace(/[\u00A0\u202F\s]/g, ' ');
};

const TransactionPdf = ({ transactions }) => {
  const formatPriceM2 = (price, surface) => {
    if (!surface || surface === 0) return '-';
    const priceM2 = Math.round(price / surface);
    return `${formatNumber(priceM2)} €/m²`;
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Explorateur DVF - Liste des Transactions</Text>
        <Text style={styles.subtitle}>
          {transactions.length} transaction{transactions.length > 1 ? 's' : ''} affichée{transactions.length > 1 ? 's' : ''}
        </Text>

        {/* Table Container */}
        <View style={styles.tableContainer}>
          {/* En-tête du tableau */}
          <View style={styles.header}>
            <Text style={[styles.cellDate, styles.headerCellLeft]}>Date</Text>
            <Text style={[styles.cellType, styles.headerCellLeft]}>Type</Text>
            <Text style={[styles.cellAddress, styles.headerCellLeft]}>Adresse</Text>
            <Text style={[styles.cellCadastre, styles.headerCellLeft]}>Cadastre</Text>
            <Text style={[styles.cellSurfaceHab, styles.headerCellRight]}>Surf. Hab.</Text>
            <Text style={[styles.cellSurfaceTer, styles.headerCellRight]}>Surf. Ter.</Text>
            <Text style={[styles.cellPrice, styles.headerCellRight]}>Prix</Text>
            <Text style={[styles.cellPriceM2, styles.headerCellRight]}>Prix/m²</Text>
            <Text style={[styles.cellDistance, styles.headerCellRight]}>Dist.</Text>
          </View>

          {/* Lignes du tableau */}
          {transactions.map((transaction, index) => (
            <View key={transaction.id} style={[styles.row, index % 2 === 1 && styles.rowEven]}>
              <Text style={styles.cellDate}>{transaction.date}</Text>
              <Text style={styles.cellType}>{transaction.type}</Text>
              <Text style={styles.cellAddress}>{transaction.address}</Text>
              <Text style={styles.cellCadastre}>{transaction.cadastre}</Text>
              <Text style={styles.cellSurfaceHab}>{formatNumber(transaction.surface)} m²</Text>
              <Text style={styles.cellSurfaceTer}>
                {transaction.terrain > 0 ? `${formatNumber(transaction.terrain)} m²` : '-'}
              </Text>
              <Text style={styles.cellPrice}>
                {formatCurrency(transaction.price)}
              </Text>
              <Text style={styles.cellPriceM2}>
                {formatPriceM2(transaction.price, transaction.surface)}
              </Text>
              <Text style={styles.cellDistance}>{formatNumber(transaction.distance)} m</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default TransactionPdf;

