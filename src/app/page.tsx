'use client'

import { Container, Typography, Button } from '@mui/material'
import Link from 'next/link'

export default function HomePage() {
  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" fontWeight={600} gutterBottom>
        Tile Simulator – Demo
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Demo profesional para simulador de mosaicos hidráulicos.
      </Typography>

      <Button variant="contained" size="large" component={Link} href="/simulator">
        Ir al Simulador
      </Button>
    </Container>
  )
}
