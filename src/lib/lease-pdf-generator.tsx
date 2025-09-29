'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Enregistrer les polices
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: '/fonts/Helvetica.ttf' },
    { src: '/fonts/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Helvetica-Oblique.ttf', fontStyle: 'italic' },
    { src: '/fonts/Helvetica-BoldOblique.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1px solid #000',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
    width: 150,
  },
  value: {
    flex: 1,
  },
  signature: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: '40%',
    borderTop: '1px solid #000',
    paddingTop: 5,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
})

interface Address {
  street: string
  postalCode: string
  city: string
  country: string
}

interface Person {
  firstName: string
  lastName: string
  address: Address
  phone?: string
  email?: string
  birthDate?: Date
  birthPlace?: string
  siret?: string
}

interface Property {
  type: string
  address: Address
  area: number
  description: string
  floor?: number
  rooms?: number
}

interface LeaseData {
  id: string
  title: string
  property: Property
  landlord: Person
  tenant: Person
  period: {
    startDate: Date
    endDate: Date
    noticePeriod: number
  }
  financialTerms: {
    rent: number
    charges: number
    deposit: number
    paymentDueDay: number
    indexationClause: boolean
    chargesIncluded: string[]
  }
  specialClauses: string[]
  createdAt: Date
}

const formatDate = (date: Date) => {
  return format(date, 'd MMMM yyyy', { locale: fr })
}

export const LeaseDocument = ({ data }: { data: LeaseData }) => {
  const { 
    title, 
    property, 
    landlord, 
    tenant, 
    period, 
    financialTerms,
    specialClauses 
  } = data

  const formatAddress = (address: Address) => {
    return `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Entre les soussignés :</Text>
        </View>

        {/* Section Bailleur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LE BAILLEUR</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom et prénom :</Text>
            <Text style={styles.value}>{`${landlord.firstName} ${landlord.lastName}`}</Text>
          </View>
          {landlord.siret && (
            <View style={styles.row}>
              <Text style={styles.label}>SIRET :</Text>
              <Text style={styles.value}>{landlord.siret}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Adresse :</Text>
            <Text style={styles.value}>{formatAddress(landlord.address)}</Text>
          </View>
          {landlord.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email :</Text>
              <Text style={styles.value}>{landlord.email}</Text>
            </View>
          )}
          {landlord.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Téléphone :</Text>
              <Text style={styles.value}>{landlord.phone}</Text>
            </View>
          )}
        </View>

        {/* Section Locataire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LE PRENANT (LE(S) LOCATAIRE(S))</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom et prénom :</Text>
            <Text style={styles.value}>{`${tenant.firstName} ${tenant.lastName}`}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresse :</Text>
            <Text style={styles.value}>{formatAddress(tenant.address)}</Text>
          </View>
          {tenant.birthDate && tenant.birthPlace && (
            <View style={styles.row}>
              <Text style={styles.label}>Né(e) le :</Text>
              <Text style={styles.value}>
                {format(tenant.birthDate, 'd MMMM yyyy', { locale: fr })} à {tenant.birthPlace}
              </Text>
            </View>
          )}
          {tenant.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email :</Text>
              <Text style={styles.value}>{tenant.email}</Text>
            </View>
          )}
          {tenant.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Téléphone :</Text>
              <Text style={styles.value}>{tenant.phone}</Text>
            </View>
          )}
        </View>

        {/* Section Bien loué */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LE BIEN LOUÉ</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type de bien :</Text>
            <Text style={styles.value}>{property.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresse :</Text>
            <Text style={styles.value}>{formatAddress(property.address)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Surface habitable :</Text>
            <Text style={styles.value}>{property.area} m²</Text>
          </View>
          {property.rooms && (
            <View style={styles.row}>
              <Text style={styles.label}>Nombre de pièces :</Text>
              <Text style={styles.value}>{property.rooms}</Text>
            </View>
          )}
          {property.floor !== undefined && (
            <View style={styles.row}>
              <Text style={styles.label}>Étage :</Text>
              <Text style={styles.value}>
                {property.floor === 0 ? 'Rez-de-chaussée' : `${property.floor}ème étage`}
              </Text>
            </View>
          )}
        </View>

        {/* Section Durée du bail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DURÉE ET EFFET DU BAIL</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Durée du bail :</Text>
            <Text style={styles.value}>
              {format(period.startDate, 'd MMMM yyyy', { locale: fr })} au{' '}
              {format(period.endDate, 'd MMMM yyyy', { locale: fr })}
              {` (${Math.round(
                (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
              )} mois)`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Préavis de résiliation :</Text>
            <Text style={styles.value}>{period.noticePeriod} mois</Text>
          </View>
        </View>

        {/* Section Loyer et charges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOYER ET CHARGES</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Loyer mensuel :</Text>
            <Text style={styles.value}>{formatCurrency(financialTerms.rent)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Charges mensuelles :</Text>
            <Text style={styles.value}>{formatCurrency(financialTerms.charges)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dépôt de garantie :</Text>
            <Text style={styles.value}>{formatCurrency(financialTerms.deposit)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jour de paiement :</Text>
            <Text style={styles.value}>{financialTerms.paymentDueDay} de chaque mois</Text>
          </View>
          {financialTerms.chargesIncluded.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Charges comprises :</Text>
              <Text style={styles.value}>{financialTerms.chargesIncluded.join(', ')}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Clause d'indexation :</Text>
            <Text style={styles.value}>
              {financialTerms.indexationClause ? 'Oui' : 'Non'}
            </Text>
          </View>
        </View>

        {/* Clauses particulières */}
        {specialClauses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLAUSES PARTICULIÈRES</Text>
            {specialClauses.map((clause, index) => (
              <View key={index} style={{ marginBottom: 5 }}>
                <Text>• {clause}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signature}>
          <View style={styles.signatureLine}>
            <Text>Fait à {property.address.city}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}</Text>
            <Text>Le(s) locataire(s)</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>Fait à {property.address.city}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}</Text>
            <Text>Le bailleur</Text>
          </View>
        </View>

        {/* Pied de page */}
        <Text style={styles.footer}>
          Document généré par SmartImmo - {format(new Date(), 'd MMMM yyyy', { locale: fr })}
        </Text>
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )}
          fixed
        />
      </Page>
    </Document>
  )
}

export const generateLeasePDF = async (data: LeaseData, outputType: 'blob' | 'buffer' = 'blob') => {
  const { renderToStream } = await import('@react-pdf/renderer')
  const stream = await renderToStream(<LeaseDocument data={data} />)
  
  if (outputType === 'blob') {
    return new Promise<Blob>((resolve, reject) => {
      const chunks: Uint8Array[] = []
      
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const blob = new Blob(chunks, { type: 'application/pdf' })
        resolve(blob)
      })
      stream.on('error', reject)
    })
  } else {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const chunks: Uint8Array[] = []
      
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks as any)
        resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
      })
      stream.on('error', reject)
    })
  }
}

export type { LeaseData }
