/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://mywbsqmluljyyfvpfbqv.supabase.co/storage/v1/object/public/email-assets/wib-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="120" height="auto" alt="Women In Business" style={logo} />
        <Heading style={h1}>Confirm Your Identity</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>This code will expire shortly. If you didn't request this, you can safely ignore this email.</Text>
        <Text style={footerBrand}>Women In Business · Non Profit Organisation (2020/911027/08)</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#FFF9F0', fontFamily: "'Roboto', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '500px', margin: '0 auto' }
const logo = { margin: '0 auto 24px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1F1F1F', margin: '0 0 20px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#666666', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '32px', fontWeight: 'bold' as const, color: '#DD1C1A', margin: '0 0 30px', textAlign: 'center' as const, letterSpacing: '6px' }
const hr = { borderColor: '#E8DCC8', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px', textAlign: 'center' as const }
const footerBrand = { fontSize: '11px', color: '#BBBBBB', textAlign: 'center' as const, margin: '0' }
