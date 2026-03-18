/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://mywbsqmluljyyfvpfbqv.supabase.co/storage/v1/object/public/email-assets/wib-logo.png'

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="120" height="auto" alt="Women In Business" style={logo} />
        <Heading style={h1}>You've Been Invited!</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
          , South Africa's premier membership community for entrepreneurial women.
        </Text>
        <Text style={text}>Click the button below to accept your invitation and get started:</Text>
        <Button style={button} href={confirmationUrl}>Accept Invitation</Button>
        <Hr style={hr} />
        <Text style={footer}>If you weren't expecting this invitation, you can safely ignore this email.</Text>
        <Text style={footerBrand}>Women In Business · Non Profit Organisation (2020/911027/08)</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#FFF9F0', fontFamily: "'Roboto', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '500px', margin: '0 auto' }
const logo = { margin: '0 auto 24px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1F1F1F', margin: '0 0 20px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#666666', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#DD1C1A', textDecoration: 'underline' }
const button = { backgroundColor: '#DD1C1A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '5px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, margin: '0 auto' }
const hr = { borderColor: '#E8DCC8', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px', textAlign: 'center' as const }
const footerBrand = { fontSize: '11px', color: '#BBBBBB', textAlign: 'center' as const, margin: '0' }
