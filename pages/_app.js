import '../styles/globals.css'
import Head from 'next/head'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>Loop Eventos — Petrolina</title>
        <meta name="description" content="LOOP NIGHT - Petrolina. Eventos com vibe jovem." />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
