import '../styles/globals.css'
import Head from 'next/head'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>Loop Eventos — LOOP NIGHT Petrolina | Ingressos Online</title>
        <meta name="description" content="LOOP NIGHT - Petrolina, 13 de dezembro. Uma noite de som pesado, resenha e muita vibe. Pulseiras limitadas, cooler liberado. Compre seu ingresso!" />
        <meta name="keywords" content="loop eventos, petrolina, festa, ingresso, loop night, eventos petrolina, balada" />
        <meta name="author" content="Loop Eventos" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://loop-eventos-pnz.netlify.app/" />
        <meta property="og:title" content="Loop Eventos — LOOP NIGHT Petrolina" />
        <meta property="og:description" content="Uma noite de som pesado, resenha e muita vibe. Pulseiras limitadas, cooler liberado. Compre seu ingresso!" />
        <meta property="og:image" content="https://loop-eventos-pnz.netlify.app/social-loop-logo.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://loop-eventos-pnz.netlify.app/" />
        <meta property="twitter:title" content="Loop Eventos — LOOP NIGHT Petrolina" />
        <meta property="twitter:description" content="Uma noite de som pesado, resenha e muita vibe. Pulseiras limitadas, cooler liberado. Compre seu ingresso!" />
        <meta property="twitter:image" content="https://loop-eventos-pnz.netlify.app/social-loop-logo.jpg" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
