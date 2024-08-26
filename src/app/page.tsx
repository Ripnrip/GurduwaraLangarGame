import GurdwaraLangarGame from '@/components/GurduwaraLangarGame';
import Head from 'next/head';

export default function Home() {
  return (
    <div>
      <Head>
      <link rel="icon" href="/favicon.png" />
      <title>Emotional Health & Spirituality in Sikhism</title>
      </Head>
      <main>
        <GurdwaraLangarGame />
      </main>
    </div>
  );
}